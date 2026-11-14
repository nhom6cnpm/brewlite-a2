/* INT-T80: staff #39 against isolated PostgreSQL + real #33/#34 APIs.
 * No project .env/volume is used. SQL changes below are explicitly test fixtures,
 * never used by the application; all staff actions use real #39 endpoints. */
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const { Client } = require('pg');

const root = path.resolve(__dirname, '..');
const name = `brewlite-admin-smoke-${Date.now()}`;
const password = randomBytes(16).toString('hex');
const secret = randomBytes(32).toString('hex');
const adminPassword = 'Smoke-' + randomBytes(12).toString('hex') + '!';
const adminEmail = 'staff@admin-smoke.test';
let child,
  client,
  base,
  started = false,
  log = '';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const redact = (value) =>
  String(value)
    .replaceAll(password, '[redacted]')
    .replaceAll(secret, '[redacted]')
    .replaceAll(adminPassword, '[redacted]');
function docker(args) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0)
    throw new Error(
      `Docker ${args[0]} failed: ${result.stderr || result.error?.message}`,
    );
  return result.stdout.trim();
}
async function port() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const value = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return value;
}
async function api(
  route,
  method = 'GET',
  data,
  token,
  expected = 200,
  extra = {},
) {
  const response = await fetch(base + route, {
    method,
    headers: {
      Accept: 'application/json',
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...extra,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = await response.json();
  assert.ok(
    (Array.isArray(expected) ? expected : [expected]).includes(response.status),
    `${method} ${route}: ${response.status} ${JSON.stringify(body)}`,
  );
  return body;
}
async function account(label) {
  const credentials = {
    email: `${label}@admin-smoke.test`,
    password: 'Test-' + randomUUID() + '!',
  };
  await api('/auth/register', 'POST', credentials, null, 201);
  return api('/auth/login', 'POST', credentials);
}
const item = { productId: 'p1', size: 'M', toppingIds: ['cream'], qty: 2 };
async function order(auth, voucherCode = 'THU5K') {
  return api(
    '/orders',
    'POST',
    { items: [item], ...(voucherCode ? { voucherCode } : {}) },
    auth.access_token,
    201,
    { 'Idempotency-Key': randomUUID() },
  );
}
async function payment(auth, created, method = 'WALLET') {
  return api(
    '/payments',
    'POST',
    { orderId: created.orderId, method },
    auth.access_token,
    [200, 201],
    { 'Idempotency-Key': randomUUID() },
  );
}
async function stock() {
  return (
    await client.query('SELECT id, quantity FROM ingredients ORDER BY id')
  ).rows;
}

(async () => {
  docker(['image', 'inspect', 'postgres:16-alpine']);
  docker([
    'run',
    '--detach',
    '--rm',
    '--name',
    name,
    '--label',
    'brewlite.test=admin-orders',
    '--tmpfs',
    '/var/lib/postgresql/data',
    '-e',
    'POSTGRES_DB=admin_smoke',
    '-e',
    `POSTGRES_PASSWORD=${password}`,
    '-p',
    '127.0.0.1::5432',
    'postgres:16-alpine',
  ]);
  started = true;
  const databasePort = docker(['port', name, '5432/tcp']).split(':').at(-1);
  const databaseUrl = `postgresql://postgres:${password}@127.0.0.1:${databasePort}/admin_smoke`;
  const apiPort = await port();
  base = 'http://127.0.0.1:' + apiPort;
  child = spawn(process.execPath, ['dist/main.js'], {
    cwd: root,
    windowsHide: true,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PORT: String(apiPort),
      NODE_ENV: 'test',
      JWT_SECRET: secret,
      ADMIN_EMAIL: adminEmail,
      ADMIN_PASSWORD: adminPassword,
      ORDER_PAYMENT_TIMEOUT_MINUTES: '15',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (chunk) => {
      log = (log + chunk).slice(-30000);
    });
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null)
      throw new Error('Test API exited: ' + redact(log));
    try {
      if ((await fetch(base + '/health')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await wait(1000);
  }
  assert.ok(ready, 'API readiness: ' + redact(log));
  client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const admin = await api('/auth/login', 'POST', {
    email: adminEmail,
    password: adminPassword,
  });
  const alice = await account('alice');
  const bob = await account('bob');

  const staff2Credentials = {
    email: 'second-staff@admin-smoke.test',
    password: 'Test-' + randomUUID() + '!',
  };
  await api('/auth/register', 'POST', staff2Credentials, null, 201);
  // Isolated fixture to create a second real staff account; never an application route.
  await client.query('UPDATE users SET role=$1 WHERE email=$2', [
    'ADMIN',
    staff2Credentials.email,
  ]);
  const staff2 = await api('/auth/login', 'POST', staff2Credentials);
  const adminToken = admin.access_token;
  const route = (id, action) => `/admin/orders/${id}/${action}`;
  const staffView = (id) =>
    api(route(id, 'detail'), 'GET', undefined, adminToken);
  const review = (
    id,
    requestId,
    approve = true,
    token = adminToken,
    expected = 200,
  ) =>
    api(
      route(id, approve ? 'cancel' : 'cancel-request/reject'),
      'POST',
      approve
        ? { requestId, note: 'Staff approved' }
        : { requestId, reason: 'Continue order' },
      token,
      expected,
    );
  const request = (auth, id) =>
    api(
      '/orders/' + id + '/cancel-request',
      'POST',
      { reason: 'Changed schedule' },
      auth.access_token,
    );
  const advance = (id, status, expected = 200) =>
    api(route(id, 'status'), 'PATCH', { status }, adminToken, expected);
  async function paid(auth, voucher = null) {
    const created = await order(auth, voucher);
    const p = await payment(auth, created, 'CARD');
    await api(
      '/admin/payments/' + p.paymentId + '/confirm',
      'POST',
      {},
      adminToken,
      [200, 201],
    );
    return created;
  }
  async function state(id) {
    return {
      stock: await stock(),
      order: (await client.query('SELECT * FROM orders WHERE id=$1', [id]))
        .rows[0],
      ledger: (
        await client.query(
          'SELECT * FROM bank_transactions WHERE "orderId"=$1 ORDER BY id',
          [id],
        )
      ).rows,
      users: (
        await client.query('SELECT id, "loyaltyPoints" FROM users ORDER BY id')
      ).rows,
      usages: (
        await client.query('SELECT * FROM voucher_usages WHERE "orderId"=$1', [
          id,
        ])
      ).rows,
    };
  }

  const accessRoutes = [
    ['GET', ''],
    ['GET', '/history'],
    ['GET', '/missing/detail'],
    ['PATCH', '/missing/status'],
    ['POST', '/missing/cancel'],
    ['POST', '/missing/cancel-request/reject'],
  ];
  for (const [method, suffix] of accessRoutes) {
    await api(
      '/admin/orders' + suffix,
      method,
      method === 'GET' ? undefined : {},
      null,
      401,
    );
    await api(
      '/admin/orders' + suffix,
      method,
      method === 'GET' ? undefined : {},
      alice.access_token,
      403,
    );
  }
  await api(
    '/admin/orders?status=PAID&cancelRequestStatus=PENDING',
    'GET',
    undefined,
    adminToken,
    400,
  );
  await api(
    '/admin/orders/history?pageSize=51',
    'GET',
    undefined,
    adminToken,
    400,
  );
  await api('/admin/orders/missing/detail', 'GET', undefined, adminToken, 404);

  // Two staff approve the same PAID voucher order: one release/refund/reversal.
  const before = await stock();
  const created = await paid(alice, 'THU5K');
  const reserved = await stock();
  const requested = await request(alice, created.orderId);
  await advance(created.orderId, 'PREPARING', 409);
  const approved = await Promise.all([
    review(created.orderId, requested.cancelRequest.id),
    review(
      created.orderId,
      requested.cancelRequest.id,
      true,
      staff2.access_token,
    ),
  ]);
  assert.ok(approved.every((v) => v.status === 'CANCELLED'));
  assert.deepEqual(await stock(), before);
  const cancelled = await staffView(created.orderId);
  assert.equal(cancelled.refundedAmount, created.total);
  assert.equal(cancelled.pointsReversed, Math.floor(created.total / 10000));
  assert.ok(
    [adminEmail, staff2Credentials.email].includes(
      cancelled.cancelReviewedByEmail,
    ),
  );
  assert.ok(
    cancelled.payments.length === 1 &&
      cancelled.payments[0].status === 'SUCCESS',
  );
  const after = await state(created.orderId);
  assert.equal(after.ledger.filter((row) => row.type === 'REFUND').length, 1);
  assert.equal(after.usages[0].status, 'RELEASED');
  await review(created.orderId, requested.cancelRequest.id);
  assert.deepEqual(await state(created.orderId), after);
  await review(
    created.orderId,
    requested.cancelRequest.id,
    false,
    adminToken,
    409,
  );

  // Refusal preserves money, stock and points; stale request cannot affect a new one.
  const preparing = await paid(bob);
  const first = await request(bob, preparing.orderId);
  const held = await state(preparing.orderId);
  await review(preparing.orderId, first.cancelRequest.id, false);
  const refused = await state(preparing.orderId);
  assert.deepEqual(refused.stock, held.stock);
  assert.deepEqual(refused.ledger, held.ledger);
  assert.deepEqual(refused.users, held.users);
  assert.equal(refused.order.status, 'PAID');
  const next = await request(bob, preparing.orderId);
  assert.notEqual(first.cancelRequest.id, next.cancelRequest.id);
  await review(
    preparing.orderId,
    first.cancelRequest.id,
    true,
    adminToken,
    409,
  );
  await review(preparing.orderId, next.cancelRequest.id, false);
  await advance(preparing.orderId, 'READY', 400);
  const priorPreparation = await state(preparing.orderId);
  await advance(preparing.orderId, 'PREPARING');
  await advance(preparing.orderId, 'PREPARING');
  await api(
    '/orders/' + preparing.orderId + '/cancel-request',
    'POST',
    { reason: 'too late' },
    bob.access_token,
    400,
  );
  await advance(preparing.orderId, 'READY');
  await advance(preparing.orderId, 'COMPLETED');
  const completed = await state(preparing.orderId);
  assert.deepEqual(completed.stock, priorPreparation.stock);
  assert.deepEqual(completed.users, priorPreparation.users);
  assert.deepEqual(completed.ledger, priorPreparation.ledger);
  assert.equal(completed.order.status, 'COMPLETED');

  // Transfer already arrived before the deadline: approve after display expiry.
  const transfer = await order(alice);
  const wallet = await payment(alice, transfer);
  await api(
    '/mock-bank/payments/' + wallet.paymentId + '/transfer',
    'POST',
    {},
    null,
    [200, 201],
  );
  await client.query(
    'UPDATE orders SET "expiresAt"=clock_timestamp()-interval \'1 minute\' WHERE id=$1',
    [transfer.orderId],
  );
  const transferRequest = await request(alice, transfer.orderId);
  await review(transfer.orderId, transferRequest.cancelRequest.id);
  assert.equal(
    (await staffView(transfer.orderId)).refundedAmount,
    transfer.total,
  );

  // Failure after refund has been written: all money, stock, voucher, audit and points roll back.
  const rollback = await paid(alice, 'THU5K');
  const rollbackRequest = await request(alice, rollback.orderId);
  const snapshot = await state(rollback.orderId);
  await client.query(
    `CREATE FUNCTION reject_admin_cancel() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='CANCELLED' AND NEW.id='${rollback.orderId}' THEN RAISE EXCEPTION 'INT-T80 injected failure'; END IF; RETURN NEW; END $$`,
  );
  await client.query(
    'CREATE TRIGGER test_admin_cancel_rollback BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION reject_admin_cancel()',
  );
  await review(
    rollback.orderId,
    rollbackRequest.cancelRequest.id,
    true,
    adminToken,
    500,
  );
  assert.deepEqual(await state(rollback.orderId), snapshot);
  await client.query('DROP TRIGGER test_admin_cancel_rollback ON orders');
  await client.query('DROP FUNCTION reject_admin_cancel()');
  await review(rollback.orderId, rollbackRequest.cancelRequest.id);

  // Competing approve/reject decisions serialize on the same request.
  const race = await paid(bob);
  const raceRequest = await request(bob, race.orderId);
  const raceResults = await Promise.all([
    review(
      race.orderId,
      raceRequest.cancelRequest.id,
      true,
      adminToken,
      [200, 409],
    ),
    review(
      race.orderId,
      raceRequest.cancelRequest.id,
      false,
      staff2.access_token,
      [200, 409],
    ),
  ]);
  assert.ok(raceResults.filter((v) => !v.statusCode).length === 1);
  const raced = await staffView(race.orderId);
  assert.ok(['APPROVED', 'REJECTED'].includes(raced.cancelRequest.status));
  assert.equal(
    raced.refundedAmount,
    raced.cancelRequest.status === 'APPROVED' ? race.total : 0,
  );

  // Request vs preparation: one wins; never PREPARING with a pending request.
  const prepRace = await paid(bob);
  const actions = await Promise.all([
    api(
      '/orders/' + prepRace.orderId + '/cancel-request',
      'POST',
      { reason: 'race' },
      bob.access_token,
      [200, 400],
    ),
    advance(prepRace.orderId, 'PREPARING', [200, 409]),
  ]);
  const prepView = await staffView(prepRace.orderId);
  assert.ok(
    (prepView.status === 'PREPARING' && prepView.cancelRequest === null) ||
      (prepView.status === 'PAID' &&
        prepView.cancelRequest.status === 'PENDING'),
  );
  assert.ok(actions.some((v) => !v.statusCode));

  // Timeout cleanup remains committed when staff click a stale action.
  const expired = await order(bob, null);
  await client.query(
    'UPDATE orders SET "expiresAt"=clock_timestamp()-interval \'1 minute\' WHERE id=$1',
    [expired.orderId],
  );
  await advance(expired.orderId, 'PREPARING', 409);
  assert.equal((await staffView(expired.orderId)).status, 'CANCELLED');

  const history = await api(
    '/admin/orders/history?status=COMPLETED&q=bob%40admin-smoke.test&pageSize=1',
    'GET',
    undefined,
    adminToken,
  );
  assert.ok(history.items.some((o) => o.id === preparing.orderId));
  assert.ok(
    history.items.every((o) => o.customerEmail === 'bob@admin-smoke.test'),
  );
  const literal = await api(
    '/admin/orders/history?q=%25',
    'GET',
    undefined,
    adminToken,
  );
  assert.equal(literal.total, 0);
  await api(
    '/orders/' + created.orderId,
    'GET',
    undefined,
    bob.access_token,
    404,
  );
  const statement = await api(
    '/admin/bank-transactions?orderId=' + created.orderId,
    'GET',
    undefined,
    adminToken,
  );
  assert.equal(statement.filter((v) => v.type === 'REFUND').length, 1);
  const swagger = await api('/api/docs-json');
  assert.ok(swagger.paths['/admin/orders/{id}/cancel'].post);
  assert.ok(swagger.paths['/admin/orders/{id}/status'].patch);
  assert.ok(swagger.components.schemas.AdminOrderDetailDto.properties.payments);
  assert.notDeepEqual(reserved, before);
  console.log(
    'INT-T80 passed: real ADMIN/JWT validation, concurrent approvals/refund once, voucher and point reversal, rejection keeps funds/stock/points, stale requestId, preparation sequence/replay, transfer after expiry, atomic rollback after refund, approve vs reject and request vs preparation races, committed expiry, searchable/paged snapshots, shared statement and Swagger.',
  );
})()
  .catch((error) => {
    console.error(redact(error.stack || error));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (client) await client.end();
    if (child && child.exitCode === null) {
      const stopped = new Promise((resolve) => child.once('exit', resolve));
      child.kill();
      await Promise.race([stopped, wait(5000)]);
    }
    if (started) docker(['rm', '-f', name]);
  });
