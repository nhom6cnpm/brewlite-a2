/**
 * BrewLite Production Smoke Test (Task 5.3 - CD-T01)
 * 
 * Kiểm tra xác thực các endpoint Production sau khi kích hoạt Render Deploy Hook:
 * 1. GET /health (API): kiểm tra trạng thái 'ok', kết nối DB, và commit SHA vừa deploy
 * 2. GET /products (API): kiểm tra danh sách sản phẩm A2 (ID dạng chuỗi, không phải số A1)
 * 3. GET / (Web): kiểm tra giao diện người dùng Next.js phản hồi HTTP 200
 * 
 * Tự động retry với backoff để chờ Render pull image mới và hoàn tất deployment.
 * Khi thất bại, script trả về exit code 1 và hiển thị hướng dẫn rollback chi tiết.
 */

const API_URL = (process.env.API_URL || 'https://brewlite-a2-api.onrender.com').replace(/\/$/, '');
const WEB_URL = (process.env.WEB_URL || 'https://brewlite-a2-web.onrender.com').replace(/\/$/, '');
const EXPECTED_COMMIT = (process.env.EXPECTED_COMMIT || '').trim();
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '24', 10);
const RETRY_DELAY_MS = parseInt(process.env.RETRY_DELAY_SECONDS || '10', 10) * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Kiểm tra tính hợp lệ của phản hồi /health
 */
export function validateHealthPayload(body, expectedCommit = '') {
  if (!body || typeof body !== 'object') {
    return 'Phản hồi /health rỗng hoặc không phải object';
  }
  if (body.status !== 'ok') {
    return `Trường status không hợp lệ: ${String(body.status)}`;
  }
  if (expectedCommit && body.commit) {
    const deployedCommit = String(body.commit).trim();
    const exp = String(expectedCommit).trim();
    if (!deployedCommit.startsWith(exp) && !exp.startsWith(deployedCommit)) {
      return `Bản deploy hiện tại (${deployedCommit}) chưa khớp commit mong đợi (${exp}). Render vẫn đang trong quá trình cập nhật container...`;
    }
  }
  return null;
}

/**
 * Kiểm tra tính hợp lệ của phản hồi /products (chuẩn A2)
 */
export function validateProductsPayload(body) {
  if (!Array.isArray(body)) {
    return `Dữ liệu /products phải là mảng, nhận được: ${typeof body}`;
  }
  if (body.length === 0) {
    return 'Danh sách sản phẩm rỗng (seed data chưa nạp hoặc database chưa có dữ liệu)';
  }
  for (const item of body) {
    if (!item || typeof item !== 'object') {
      return 'Phần tử sản phẩm không hợp lệ';
    }
    if (typeof item.id === 'number') {
      return 'Phát hiện ID sản phẩm dạng số (dữ liệu A1 cũ), hệ thống A2 yêu cầu ID dạng chuỗi (p1..p6 hoặc string id)';
    }
    if (!item.id || typeof item.name !== 'string' || typeof item.price !== 'number') {
      return 'Sản phẩm thiếu các trường bắt buộc (id, name, price)';
    }
  }
  return null;
}

/**
 * Kiểm tra tính hợp lệ của phản hồi Web
 */
export function validateWebPayload(body, status) {
  if (status !== 200) {
    return `Frontend Web trả về HTTP ${status}`;
  }
  if (typeof body === 'string' && body.length < 50) {
    return 'Nội dung HTML trả về quá ngắn hoặc không hợp lệ';
  }
  return null;
}

export async function checkEndpoint(url, validator, name) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'BrewLite-CD-SmokeTest/1.0',
        'Accept': 'application/json, text/html, */*',
      },
      signal: AbortSignal.timeout(15000),
    });

    const contentType = res.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status} ${res.statusText}` };
    }

    const validationError = validator(body, res.status);
    if (validationError) {
      return { ok: false, status: res.status, error: validationError, body };
    }

    return { ok: true, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

export async function runSmokeTests(options = {}) {
  const apiUrl = options.apiUrl || API_URL;
  const webUrl = options.webUrl || WEB_URL;
  const expectedCommit = options.expectedCommit ?? EXPECTED_COMMIT;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const retryDelay = options.retryDelay ?? RETRY_DELAY_MS;

  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU PRODUCTION SMOKE TEST CHO BREWLITE (A2)');
  console.log(`- API URL: ${apiUrl}`);
  console.log(`- Web URL: ${webUrl}`);
  if (expectedCommit) {
    console.log(`- Commit mong đợi: ${expectedCommit}`);
  }
  console.log(`- Số lần thử tối đa: ${maxRetries} (khoảng cách: ${retryDelay / 1000}s)`);
  console.log('====================================================\n');

  // 1. Kiểm tra API /health
  let healthOk = false;
  let healthResult = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    process.stdout.write(`[1/3] Kiểm tra GET ${apiUrl}/health (Lần thử ${attempt}/${maxRetries})... `);
    healthResult = await checkEndpoint(
      `${apiUrl}/health`,
      (body) => validateHealthPayload(body, expectedCommit),
      'API Health',
    );

    if (healthResult.ok) {
      console.log(`✅ Thành công (HTTP ${healthResult.status}) - ${JSON.stringify(healthResult.body)}`);
      healthOk = true;
      break;
    }

    console.log(`⏳ Đang chờ (${healthResult.error})`);
    if (attempt < maxRetries) {
      await sleep(retryDelay);
    }
  }

  if (!healthOk) {
    printRollbackGuide(`Endpoint /health không đạt sau ${maxRetries} lần thử: ${healthResult?.error}`);
    return false;
  }

  // 2. Kiểm tra API /products (chuẩn A2)
  console.log(`\n[2/3] Kiểm tra GET ${apiUrl}/products... `);
  const productsResult = await checkEndpoint(
    `${apiUrl}/products`,
    (body) => validateProductsPayload(body),
    'API Products',
  );

  if (!productsResult.ok) {
    printRollbackGuide(`Endpoint /products không phản hồi đúng dữ liệu chuẩn A2: ${productsResult.error}`);
    return false;
  }
  console.log(`✅ Thành công (HTTP ${productsResult.status}) - Nhận diện ${productsResult.body.length} sản phẩm A2 từ database`);

  // 3. Kiểm tra Web Frontend
  console.log(`\n[3/3] Kiểm tra GET ${webUrl}... `);
  let webOk = false;
  let webResult = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    process.stdout.write(`Kiểm tra Web (Lần thử ${attempt}/${maxRetries})... `);
    webResult = await checkEndpoint(
      webUrl,
      (body, status) => validateWebPayload(body, status),
      'Web Frontend',
    );

    if (webResult.ok) {
      console.log(`✅ Thành công (HTTP ${webResult.status}) - Frontend PWA phản hồi tốt`);
      webOk = true;
      break;
    }

    console.log(`⏳ Đang chờ (${webResult.error})`);
    if (attempt < maxRetries) {
      await sleep(retryDelay);
    }
  }

  if (!webOk) {
    printRollbackGuide(`Frontend Web không phản hồi HTTP 200: ${webResult?.error}`);
    return false;
  }

  console.log('\n====================================================');
  console.log('🎉 TOÀN BỘ PRODUCTION SMOKE TEST ĐỀU QUA THÀNH CÔNG!');
  console.log('Hệ thống BrewLite A2 trên Render đã sẵn sàng phục vụ.');
  console.log('====================================================\n');
  return true;
}

function printRollbackGuide(reason) {
  console.error('\n' + '='.repeat(60));
  console.error('🚨 SMOKE TEST THẤT BẠI - YÊU CẦU DỪNG PIPELINE VÀ ROLLBACK');
  console.error(`Nguyên nhân: ${reason}`);
  console.error('='.repeat(60));
  console.error(`
HƯỚNG DẪN ROLLBACK KHẨN CẤP:
1. Đăng nhập Render Dashboard (https://dashboard.render.com).
2. Chọn service gặp sự cố:
   - 'brewlite-a2-api' (NestJS Backend & DB Migration)
   - 'brewlite-a2-web' (Next.js Frontend)
3. Chuyển sang tab "Events" (Lịch sử triển khai).
4. Tìm bản build / deploy thành công gần nhất trước đó.
5. Nhấp chuột vào nút "Rollback to this deploy" để đưa hệ thống về trạng thái ổn định ngay lập tức.
6. Hoặc cập nhật Image URL về commit SHA trước đó trên Container Registry:
   - ghcr.io/nhom6cnpm/brewlite-api:sha-<previous_sha>
   - ghcr.io/nhom6cnpm/brewlite-web:sha-<previous_sha>
7. Xem chi tiết tại tài liệu docs/deployment.md.
` + '='.repeat(60) + '\n');
}

// Chạy trực tiếp nếu được gọi từ command line
if (process.argv[1] && process.argv[1].endsWith('smoke-test.mjs')) {
  runSmokeTests()
    .then((success) => {
      if (!success) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('Lỗi nghiêm trọng khi thực thi smoke test:', err);
      process.exit(1);
    });
}
