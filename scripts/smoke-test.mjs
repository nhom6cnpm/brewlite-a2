/**
 * BrewLite Production Smoke Test
 * 
 * Thực hiện kiểm thử khói (smoke test) sau triển khai trên môi trường Production:
 * 1. GET /health (API): kiểm tra trạng thái dịch vụ và kết nối PostgreSQL
 * 2. GET /products (API): kiểm tra dữ liệu sản phẩm mẫu đã sẵn sàng
 * 3. GET / (Web): kiểm tra giao diện người dùng Next.js phản hồi HTTP 200
 * 
 * Tự động retry với backoff để chờ Render pull image và hoàn tất container start.
 * Khi thất bại, script trả về exit code 1 và hiển thị hướng dẫn rollback chi tiết.
 */

const API_URL = (process.env.API_URL || 'https://brewlite-api.onrender.com').replace(/\/$/, '');
const WEB_URL = (process.env.WEB_URL || 'https://brewlite-web.onrender.com').replace(/\/$/, '');
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '18', 10);
const RETRY_DELAY_MS = parseInt(process.env.RETRY_DELAY_SECONDS || '10', 10) * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status} ${res.statusText}` };
    }

    const contentType = res.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    const validationError = validator(body, res);
    if (validationError) {
      return { ok: false, status: res.status, error: validationError };
    }

    return { ok: true, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

export async function runSmokeTests(options = {}) {
  const apiUrl = options.apiUrl || API_URL;
  const webUrl = options.webUrl || WEB_URL;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const retryDelay = options.retryDelay ?? RETRY_DELAY_MS;

  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU PRODUCTION SMOKE TEST CHO BREWLITE');
  console.log(`- API URL: ${apiUrl}`);
  console.log(`- Web URL: ${webUrl}`);
  console.log(`- Số lần thử tối đa: ${maxRetries} (khoảng cách: ${retryDelay / 1000}s)`);
  console.log('====================================================\n');

  // 1. Kiểm tra API /health
  let healthOk = false;
  let healthResult = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    process.stdout.write(`[1/3] Kiểm tra GET ${apiUrl}/health (Lần thử ${attempt}/${maxRetries})... `);
    healthResult = await checkEndpoint(
      `${apiUrl}/health`,
      (body) => {
        if (!body || body.status !== 'ok') {
          return `Phản hồi health không hợp lệ: ${JSON.stringify(body)}`;
        }
        return null;
      },
      'API Health',
    );

    if (healthResult.ok) {
      console.log(`✅ Thành công (HTTP ${healthResult.status}) - ${JSON.stringify(healthResult.body)}`);
      healthOk = true;
      break;
    }

    console.log(`⏳ Chưa sẵn sàng (${healthResult.error})`);
    if (attempt < maxRetries) {
      await sleep(retryDelay);
    }
  }

  if (!healthOk) {
    printRollbackGuide(`Endpoint /health không vượt qua kiểm thử sau ${maxRetries} lần thử: ${healthResult?.error}`);
    return false;
  }

  // 2. Kiểm tra API /products
  console.log(`\n[2/3] Kiểm tra GET ${apiUrl}/products... `);
  const productsResult = await checkEndpoint(
    `${apiUrl}/products`,
    (body) => {
      if (!Array.isArray(body)) {
        return `Dữ liệu /products phải là mảng, nhận được: ${typeof body}`;
      }
      if (body.length === 0) {
        return 'Danh sách sản phẩm rỗng (seed data chưa nạp hoặc database chưa có dữ liệu)';
      }
      return null;
    },
    'API Products',
  );

  if (!productsResult.ok) {
    printRollbackGuide(`Endpoint /products không phản hồi đúng dữ liệu: ${productsResult.error}`);
    return false;
  }
  console.log(`✅ Thành công (HTTP ${productsResult.status}) - Nhận diện ${productsResult.body.length} sản phẩm từ database`);

  // 3. Kiểm tra Web Frontend
  console.log(`\n[3/3] Kiểm tra GET ${webUrl}... `);
  const webResult = await checkEndpoint(
    webUrl,
    (body, res) => {
      if (typeof body === 'string' && body.length < 50) {
        return 'Trang web trả về nội dung rỗng hoặc không hợp lệ';
      }
      return null;
    },
    'Web Frontend',
  );

  if (!webResult.ok) {
    printRollbackGuide(`Frontend Web không phản hồi HTTP 200: ${webResult.error}`);
    return false;
  }
  console.log(`✅ Thành công (HTTP ${webResult.status}) - Frontend PWA phản hồi tốt`);

  console.log('\n====================================================');
  console.log('🎉 TOÀN BỘ PRODUCTION SMOKE TEST ĐỀU QUA THÀNH CÔNG!');
  console.log('Hệ thống BrewLite trên Render đã sẵn sàng phục vụ.');
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
   - 'brewlite-api' (NestJS Backend & DB Migration)
   - 'brewlite-web' (Next.js Frontend)
3. Chuyển sang tab "Events" (Lịch sử triển khai).
4. Tìm bản build / deploy thành công gần nhất trước đó.
5. Nhấp chuột vào nút "Rollback to this deploy" để đưa hệ thống về trạng thái ổn định ngay lập tức.
6. Hoặc triển khai lại image tag trước trên Container Registry (ghcr.io):
   - Tag format: ghcr.io/nhom6cnpm/brewlite-api:sha-<previous_commit_sha>
   - Tag format: ghcr.io/nhom6cnpm/brewlite-web:sha-<previous_commit_sha>
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
