/* INT-T70: customer #37 against isolated PostgreSQL + real #33/#34 APIs.
 * No project .env/volume is used. SQL changes below are explicitly test fixtures,
 * never customer/admin endpoints or an implementation of #39. */
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const { Client } = require('pg');

const root = path.resolve(__dirname, '..');
const name = `brewlite-customer-smoke-${Date.now()}`;
const password = randomBytes(16).toString('hex');
const secret = randomBytes(32).toString('hex');
const adminPassword = 'Smoke-' + randomBytes(12).toString('hex') + '!';
const adminEmail = 'staff@customer-smoke.test';
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
    email: `${label}@customer-smoke.test`,
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
const detail = (auth, id) =>
  api('/orders/' + id, 'GET', undefined, auth.access_token);
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
    'brewlite.test=customer-orders',
    '--tmpfs',
    '/var/lib/postgresql/data',
    '-e',
    'POSTGRES_DB=customer_smoke',
    '-e',
    `POSTGRES_PASSWORD=${password}`,
    '-p',
    '127.0.0.1::5432',
    'postgres:16-alpine',
  ]);
  started = true;
  const databasePort = docker(['port', name, '5432/tcp']).split(':').at(-1);
  const databaseUrl = `postgresql://postgres:${password}@127.0.0.1:${databasePort}/customer_smoke`;
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
  for (let i = 0; i < 60; i++) {
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

  // Missing JWT, strict body, ownership and duplicate immediate cancellations.
  const baseline = await stock();
  const unpaid = await order(alice);
  await api('/orders/' + unpaid.orderId + '/cancel', 'POST', {}, null, 401);
  await api(
    '/orders/' + unpaid.orderId + '/cancel',
    'POST',
    {},
    bob.access_token,
    404,
  );
  await api(
    '/orders/' + unpaid.orderId + '/cancel',
    'POST',
    { userId: bob.user.id },
    alice.access_token,
    400,
  );
  const results = await Promise.all(
    [1, 2].map(() =>
      api(
        '/orders/' + unpaid.orderId + '/cancel',
        'POST',
        {},
        alice.access_token,
      ),
    ),
  );
  assert.ok(results.every((value) => value.status === 'CANCELLED'));
  assert.deepEqual(await stock(), baseline);
  const released = (
    await client.query('SELECT status FROM voucher_usages WHERE "orderId"=$1', [
      unpaid.orderId,
    ])
  ).rows;
  assert.equal(released[0].status, 'RELEASED');

  // Received money is NOT PAID. An expired display deadline must not block a request.
  const received = await order(alice);
  const wallet = await payment(alice, received);
  await api(
    '/mock-bank/payments/' + wallet.paymentId + '/transfer',
    'POST',
    {},
    null,
    [200, 201],
  );
  await client.query(
    'UPDATE orders SET "expiresAt"=clock_timestamp()-interval \'1 minute\' WHERE id=$1',
    [received.orderId],
  );
  const receivedView = await detail(alice, received.orderId);
  assert.equal(receivedView.status, 'PENDING');
  assert.equal(receivedView.transferReceived, true);
  assert.equal(receivedView.canRequestCancellation, true);
  assert.equal(receivedView.canPay, false);
  await api(
    '/orders/' + received.orderId + '/cancel',
    'POST',
    {},
    alice.access_token,
    409,
  );
  await api(
    '/orders/' + received.orderId + '/cancel-request',
    'POST',
    { reason: '   ' },
    alice.access_token,
    400,
  );
  const requested = await Promise.all(
    [1, 2].map(() =>
      api(
        '/orders/' + received.orderId + '/cancel-request',
        'POST',
        { reason: '  schedule change  ' },
        alice.access_token,
      ),
    ),
  );
  assert.equal(requested[0].cancelRequest.id, requested[1].cancelRequest.id);
  assert.equal(requested[0].cancelRequest.reason, 'schedule change');
  assert.equal(requested[0].status, 'PENDING');
  assert.equal(requested[0].refundedAmount, 0);
  await api(
    '/admin/payments/' + wallet.paymentId + '/confirm',
    'POST',
    {},
    admin.access_token,
    409,
  );

  // Paid card: points are stored, only request is allowed and no automatic refund.
  const paid = await order(alice, null);
  const card = await payment(alice, paid, 'CARD');
  await api(
    '/admin/payments/' + card.paymentId + '/confirm',
    'POST',
    {},
    admin.access_token,
    [200, 201],
  );
  const paidView = await detail(alice, paid.orderId);
  assert.equal(paidView.status, 'PAID');
  assert.equal(paidView.paymentMethod, 'CARD');
  assert.equal(paidView.pointsEarned, Math.floor(paid.total / 10000));
  await api(
    '/orders/' + paid.orderId + '/cancel',
    'POST',
    {},
    alice.access_token,
    409,
  );
  const paidRequest = await api(
    '/orders/' + paid.orderId + '/cancel-request',
    'POST',
    { reason: 'cannot collect' },
    alice.access_token,
  );
  assert.equal(paidRequest.status, 'PAID');
  assert.equal(paidRequest.pointsReversed, 0);
  assert.equal(paidRequest.refundedAmount, 0);

  // Rejecting a different wallet payment records a real refund visible in history.
  const rejected = await order(bob, null);
  const rejectedWallet = await payment(bob, rejected);
  await api(
    '/mock-bank/payments/' + rejectedWallet.paymentId + '/transfer',
    'POST',
    {},
    null,
    [200, 201],
  );
  await api(
    '/admin/payments/' + rejectedWallet.paymentId + '/reject',
    'POST',
    { note: 'test rejection' },
    admin.access_token,
    [200, 201],
  );
  const refunded = await detail(bob, rejected.orderId);
  assert.equal(refunded.status, 'PAYMENT_FAILED');
  assert.equal(refunded.refundedAmount, rejected.total);
  assert.equal(refunded.paymentMethod, 'WALLET');
  await api(
    '/orders/' + rejected.orderId + '/cancel',
    'POST',
    {},
    bob.access_token,
  );
  assert.equal(
    (await detail(bob, rejected.orderId)).refundedAmount,
    rejected.total,
  );

  // Test-only state setup: staff preparation/review endpoints belong to #39.
  const preparing = await order(bob, null);
  await client.query("UPDATE orders SET status='PREPARING' WHERE id=$1", [
    preparing.orderId,
  ]);
  await api(
    '/orders/' + preparing.orderId + '/cancel',
    'POST',
    {},
    bob.access_token,
    400,
  );
  await api(
    '/orders/' + preparing.orderId + '/cancel-request',
    'POST',
    { reason: 'reason' },
    bob.access_token,
    400,
  );

  // Fault injection: failure after the payment hook must roll back payment changes too.
  const rollbackOrder = await order(bob, null);
  const rollbackPayment = await payment(bob, rollbackOrder);
  await client.query(
    'DELETE FROM order_ingredient_reservations WHERE "orderId"=$1',
    [rollbackOrder.orderId],
  );
  await api(
    '/orders/' + rollbackOrder.orderId + '/cancel',
    'POST',
    {},
    bob.access_token,
    409,
  );
  assert.equal((await detail(bob, rollbackOrder.orderId)).status, 'PENDING');
  const rollbackView = await api(
    '/payments/' + rollbackPayment.paymentId,
    'GET',
    undefined,
    bob.access_token,
  );
  assert.equal(rollbackView.status, 'PENDING');

  // Race the customer with real payment writes: the same order lock must serialize them.
  async function racePost(route, token, data = {}) {
    const response = await fetch(base + route, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(data),
    });
    return { status: response.status, body: await response.json() };
  }
  const raceBaseline = await stock();
  const transferRace = await order(bob, null);
  const transferRacePayment = await payment(bob, transferRace);
  const raceReservedStock = await stock();
  const [cancelRace, incomingRace] = await Promise.all([
    racePost('/orders/' + transferRace.orderId + '/cancel', bob.access_token),
    racePost(
      '/mock-bank/payments/' + transferRacePayment.paymentId + '/transfer',
      null,
    ),
  ]);
  const raceView = await detail(bob, transferRace.orderId);
  if (raceView.status === 'CANCELLED') {
    assert.equal(cancelRace.status, 200);
    assert.equal(incomingRace.status, 400);
    assert.deepEqual(await stock(), raceBaseline);
    assert.equal(
      (
        await client.query(
          'SELECT count(*)::int AS count FROM bank_transactions WHERE "orderId"=$1',
          [transferRace.orderId],
        )
      ).rows[0].count,
      0,
    );
  } else {
    assert.equal(raceView.status, 'PENDING');
    assert.equal(cancelRace.status, 409);
    assert.ok([200, 201].includes(incomingRace.status));
    assert.equal(raceView.transferReceived, true);
    assert.deepEqual(await stock(), raceReservedStock);
  }
  const confirmationRace = await order(bob, null);
  const confirmationPayment = await payment(bob, confirmationRace);
  await api(
    '/mock-bank/payments/' + confirmationPayment.paymentId + '/transfer',
    'POST',
    {},
    null,
    [200, 201],
  );
  const [requestRace, confirmation] = await Promise.all([
    racePost(
      '/orders/' + confirmationRace.orderId + '/cancel-request',
      bob.access_token,
      { reason: 'concurrent request' },
    ),
    racePost(
      '/admin/payments/' + confirmationPayment.paymentId + '/confirm',
      admin.access_token,
    ),
  ]);
  assert.equal(requestRace.status, 200);
  const confirmationView = await detail(bob, confirmationRace.orderId);
  assert.equal(confirmationView.cancelRequest.status, 'PENDING');
  assert.equal(confirmationView.refundedAmount, 0);
  assert.ok(['PENDING', 'PAID'].includes(confirmationView.status));
  if (confirmationView.status === 'PAID') {
    assert.ok([200, 201].includes(confirmation.status));
    assert.equal(
      confirmationView.pointsEarned,
      Math.floor(confirmationRace.total / 10000),
    );
  } else {
    assert.equal(confirmation.status, 409);
    assert.equal(confirmationView.pointsEarned, 0);
  }

  const mine = await api('/orders/me', 'GET', undefined, alice.access_token);
  assert.ok(
    mine.every(
      (value) =>
        ![rejected.orderId, preparing.orderId, rollbackOrder.orderId].includes(
          value.id,
        ),
    ),
  );
  await api(
    '/orders/' + received.orderId,
    'GET',
    undefined,
    bob.access_token,
    404,
  );
  const swagger = await api('/api/docs-json');
  assert.ok(swagger.paths['/orders/{id}/cancel-request'].post);
  assert.ok(
    swagger.components.schemas.CustomerOrderViewDto.properties.refundedAmount,
  );
  console.log(
    'INT-T70 passed: real JWT/ownership, strict bodies, concurrent/replayed cancellations, stock/voucher release once, transfer vs cancellation race, staff confirmation vs request race, received transfer after deadline, pending request blocks confirmation, PAID request keeps money/points, real refund history, PREPARING refusal, rollback and Swagger.',
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
