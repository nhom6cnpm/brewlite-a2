/* INT-T50: isolated PostgreSQL smoke test for guest/JWT quotes and account quotas. */
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { Client } = require('pg');
const { DataSource } = require('typeorm');
const { JwtService } = require('@nestjs/jwt');

const apiRoot = path.resolve(__dirname, '..');
const container = `brewlite-voucher-smoke-${Date.now()}-${randomBytes(3).toString('hex')}`;
const password = randomBytes(16).toString('hex');
const jwtSecret = randomBytes(32).toString('hex');
const jwt = new JwtService({ secret: jwtSecret });
const image = 'postgres:16-alpine';
const item = {
  productId: 'voucher-smoke-product',
  size: 'M',
  toppingIds: ['cream'],
  qty: 2,
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let child,
  client,
  base,
  usageDataSource,
  started = false;
let log = '';

function docker(args) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0)
    throw new Error(
      `Docker ${args[0]} failed. ${result.stderr ?? result.error?.message ?? ''}`,
    );
  return result.stdout.trim();
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function stopApi() {
  if (!child || child.exitCode !== null) return;
  const stopped = new Promise((resolve) => child.once('exit', resolve));
  child.kill();
  await Promise.race([stopped, wait(5000)]);
}

async function startApi(databaseUrl, port) {
  const entry = ['dist/main.js', 'dist/src/main.js'].find((file) =>
    existsSync(path.join(apiRoot, file)),
  );
  assert.ok(entry, 'Run npm run build before the voucher smoke test.');
  child = spawn(process.execPath, [entry], {
    cwd: apiRoot,
    windowsHide: true,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PORT: String(port),
      NODE_ENV: 'test',
      JWT_SECRET: jwtSecret,
      JWT_EXPIRES_IN: '1h',
      ADMIN_EMAIL: '',
      ADMIN_PASSWORD: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => {
    log = (log + chunk).slice(-30000);
  });
  child.stderr.on('data', (chunk) => {
    log = (log + chunk).slice(-30000);
  });
  for (let i = 0; i < 45; i++) {
    try {
      if ((await fetch(base + '/health')).ok) return;
    } catch {}
    if (child.exitCode !== null)
      throw new Error(
        'Test API exited before healthcheck. ' +
          log
            .replaceAll(password, '[redacted]')
            .replaceAll(jwtSecret, '[redacted]'),
      );
    await wait(1000);
  }
  throw new Error(
    'Timed out waiting for the isolated test API. ' +
      log
        .replaceAll(password, '[redacted]')
        .replaceAll(jwtSecret, '[redacted]'),
  );
}

async function post(body, expectedStatus = 200, authorization) {
  const response = await fetch(base + '/vouchers/quote', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(authorization === undefined ? {} : { Authorization: authorization }),
    },
  });
  const data = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(data));
  return data;
}

async function workflowSnapshot() {
  const snapshot = {};
  for (const table of [
    'orders',
    'voucher_usages',
    'voucher_user_quotas',
    'ingredients',
  ]) {
    const exists = (
      await client.query('SELECT to_regclass($1) AS name', [table])
    ).rows[0].name;
    snapshot[table] = exists
      ? (
          await client.query(
            `SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) AS rows FROM ${table} t`,
          )
        ).rows[0].rows
      : null;
  }
  return snapshot;
}

(async () => {
  // Use an existing image, a random container/ports and tmpfs. No project volume or .env is modified.
  docker(['image', 'inspect', image]);
  docker([
    'run',
    '--detach',
    '--rm',
    '--name',
    container,
    '--label',
    'brewlite.test=vouchers',
    '--tmpfs',
    '/var/lib/postgresql/data',
    '-e',
    'POSTGRES_DB=voucher_smoke',
    '-e',
    `POSTGRES_PASSWORD=${password}`,
    '-p',
    '127.0.0.1::5432',
    image,
  ]);
  started = true;
  const databasePort = docker(['port', container, '5432/tcp'])
    .split(':')
    .at(-1);
  assert.match(databasePort, /^\d+$/);
  const databaseUrl = `postgresql://postgres:${password}@127.0.0.1:${databasePort}/voucher_smoke`;
  const apiPort = await freePort();
  base = `http://127.0.0.1:${apiPort}`;
  await startApi(databaseUrl, apiPort);
  client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query(
    'INSERT INTO products (id, name, price, "imageUrl") VALUES ($1,$2,$3,$4)',
    [item.productId, 'Voucher smoke', 30000, '/images/americano.jpg'],
  );
  const seeds = (
    await client.query(
      'SELECT code, "startsAt", "endsAt", "maxUsesPerUser" FROM vouchers ORDER BY code',
    )
  ).rows;
  for (const code of ['THU5K', 'BREW10', 'NHOM15K', 'NHAP7K'])
    assert.ok(seeds.some((v) => v.code === code));
  for (const row of seeds.filter((v) =>
    ['THU5K', 'BREW10', 'NHOM15K', 'NHAP7K'].includes(v.code),
  )) {
    assert.equal(row.endsAt - row.startsAt, 30 * 86400000);
    assert.equal(row.maxUsesPerUser, 3);
  }
  const catalog = await (await fetch(base + '/vouchers')).json();
  assert.ok(catalog.some((v) => v.code === 'THU5K'));
  assert.ok(
    catalog.every((v) => v.isPublic && v.isActive && v.code !== 'NHAP7K'),
  );
  const swagger = await (await fetch(base + '/api/docs-json')).json();
  assert.ok(swagger.paths['/vouchers/quote'].post);
  const before = await workflowSnapshot();
  const normal = await post({ items: [item], voucherCode: ' brew10 ' });
  assert.deepEqual(
    [normal.subtotal, normal.discount, normal.total, normal.voucherCode],
    [80000, 8000, 72000, 'BREW10'],
  );
  assert.equal(normal.voucherUsage, null);
  assert.ok(normal.vouchers.every((v) => v.usage === null));
  const capped = await post({
    items: [{ ...item, qty: 5 }],
    voucherCode: 'BREW10',
  });
  assert.equal(capped.discount, 10000);
  const hidden = await post({
    items: [{ ...item, toppingIds: [], qty: 1 }],
    voucherCode: ' nhap7k ',
  });
  assert.deepEqual(
    [hidden.subtotal, hidden.discount, hidden.total],
    [35000, 7000, 28000],
  );
  assert.ok(hidden.vouchers.every((v) => v.code !== 'NHAP7K'));
  const group = await post({
    items: [{ ...item, size: 'L', toppingIds: [], qty: 3 }],
    voucherCode: 'NHOM15K',
  });
  assert.equal(group.total, 105000);
  const fixed = await post({
    items: [{ ...item, size: 'S', toppingIds: [], qty: 1 }],
    voucherCode: 'THU5K',
  });
  assert.equal(fixed.total, 25000);
  const unselected = await post({
    items: [{ ...item, size: 'S', toppingIds: [], qty: 1 }],
  });
  assert.equal(unselected.voucherCode, null);
  assert.ok(
    unselected.vouchers.find((v) => v.code === 'BREW10').unavailableReason,
  );
  for (const payload of [
    { items: [item], subtotal: 1 },
    { items: [{ ...item, unitPrice: 1 }] },
    { items: [item], userId: 'forged' },
    { items: [{ ...item, toppingIds: ['unknown'] }] },
    { items: [] },
    { items: [{ ...item, productId: 'missing' }] },
    { items: [item], voucherCode: 'BAD' },
    { items: [{ ...item, qty: 0 }] },
  ])
    await post(payload, 400);
  await post({ items: [item] }, 401, 'Bearer unverified');
  assert.deepEqual(await workflowSnapshot(), before);

  // Register/login through main's actual AuthModule, not a token/identity stub.
  async function account(label) {
    const credentials = {
      email: `${label}@voucher-smoke.test`,
      password: `Smoke-${randomBytes(10).toString('hex')}!`,
    };
    const registered = await fetch(base + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    assert.equal(registered.status, 201);
    const response = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(data.access_token && data.user.id);
    return {
      userId: data.user.id,
      authorization: `Bearer ${data.access_token}`,
      email: credentials.email,
    };
  }
  const alice = await account('alice');
  const bob = await account('bob');
  const emptyQuota = await workflowSnapshot();
  const initial = await post(
    { items: [item], voucherCode: 'THU5K' },
    200,
    alice.authorization,
  );
  assert.equal(initial.voucherUsage.availableUses, 3);
  assert.deepEqual(
    await workflowSnapshot(),
    emptyQuota,
    'Quoting must never create quota/usage rows.',
  );
  const expired = jwt.sign(
    { sub: alice.userId, email: alice.email },
    { expiresIn: -1 },
  );
  await post({ items: [item] }, 401, `Bearer ${expired}`);
  const unknownAccount = jwt.sign({
    sub: '00000000-0000-4000-8000-000000000001',
    email: 'missing@example.test',
  });
  await post({ items: [item] }, 401, `Bearer ${unknownAccount}`);

  // Check the migrations' user FKs on both tables and their lifecycle constraint.
  for (const table of ['voucher_user_quotas', 'voucher_usages']) {
    const { rows } = await client.query(
      "SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid=$1::regclass AND confrelid='users'::regclass AND contype='f'",
      [table],
    );
    assert.equal(rows[0].count, 1);
  }
  await assert.rejects(
    client.query(
      'INSERT INTO voucher_user_quotas ("userId", "voucherCode") VALUES ($1,$2)',
      ['00000000-0000-4000-8000-000000000001', 'THU5K'],
    ),
    (error) => error.code === '23503',
  );

  const { Voucher } = require(
    path.join(apiRoot, 'dist/vouchers/voucher.entity.js'),
  );
  const { VoucherUsage } = require(
    path.join(apiRoot, 'dist/vouchers/voucher-usage.entity.js'),
  );
  const { VoucherUserQuota } = require(
    path.join(apiRoot, 'dist/vouchers/voucher-user-quota.entity.js'),
  );
  const { VoucherUsagesService } = require(
    path.join(apiRoot, 'dist/vouchers/voucher-usages.service.js'),
  );
  usageDataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [Voucher, VoucherUsage, VoucherUserQuota],
    synchronize: false,
  });
  await usageDataSource.initialize();
  const { AddVoucherUsages1794355200002 } = require(
    path.join(apiRoot, 'dist/migrations/1794355200002-AddVoucherUsages.js'),
  );
  const migration = new AddVoucherUsages1794355200002();
  const ddlRunner = usageDataSource.createQueryRunner();
  await ddlRunner.connect();
  await ddlRunner.startTransaction();
  try {
    await migration.down(ddlRunner);
  } finally {
    await ddlRunner.rollbackTransaction();
    await ddlRunner.release();
  }
  const usages = new VoucherUsagesService();
  const order = (id, code = 'THU5K') => ({
    id,
    userId: alice.userId,
    voucherCode: code,
    subtotal: 80000,
    expiresAt: new Date(Date.now() + 600000),
  });
  // These service fixtures stand in for #33's future order transaction; no order API/table is created here.
  const contenders = Array.from({ length: 5 }, (_, index) =>
    order(`quota-race-${index}`),
  );
  const results = await Promise.allSettled(
    contenders.map((value) =>
      usageDataSource.transaction((manager) => usages.reserve(value, manager)),
    ),
  );
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    3,
  );
  for (const result of results.filter((value) => value.status === 'rejected'))
    assert.equal(result.reason.getStatus(), 409);
  await post({ items: [item], voucherCode: 'THU5K' }, 409, alice.authorization);
  assert.equal(
    (
      await post(
        { items: [item], voucherCode: 'THU5K' },
        200,
        bob.authorization,
      )
    ).voucherUsage.availableUses,
    3,
  );
  const held = (
    await client.query(
      'SELECT "orderId" FROM voucher_usages WHERE "userId"=$1 AND status=\'RESERVED\' ORDER BY "orderId"',
      [alice.userId],
    )
  ).rows;
  const firstOrder = order(held[0].orderId);
  await usageDataSource.transaction(async (manager) => {
    await usages.markUsed(firstOrder, manager, new Date());
    await usages.markUsed(firstOrder, manager, new Date());
    await usages.release(firstOrder, manager, new Date());
    await usages.release(firstOrder, manager, new Date());
  });
  assert.equal(
    (
      await post(
        { items: [item], voucherCode: 'THU5K' },
        200,
        alice.authorization,
      )
    ).voucherUsage.availableUses,
    1,
  );
  await usageDataSource.transaction((manager) =>
    usages.reserve(order('quota-after-release'), manager),
  );
  const remaining = (
    await client.query(
      'SELECT "orderId" FROM voucher_usages WHERE "userId"=$1 AND status=\'RESERVED\'',
      [alice.userId],
    )
  ).rows;
  for (const value of remaining)
    await usageDataSource.transaction((manager) =>
      usages.markUsed(order(value.orderId), manager, new Date()),
    );
  await post({ items: [item], voucherCode: 'THU5K' }, 409, alice.authorization);
  assert.ok(
    (await post({ items: [item] }, 200, alice.authorization)).vouchers.every(
      (value) => value.code !== 'THU5K',
    ),
  );
  assert.equal(
    (
      await post(
        { items: [item], voucherCode: 'THU5K' },
        200,
        bob.authorization,
      )
    ).voucherUsage.availableUses,
    3,
  );
  await assert.rejects(
    usageDataSource.transaction(async (manager) => {
      await usages.reserve(order('quota-rollback', 'BREW10'), manager);
      throw new Error('forced test rollback');
    }),
    /forced test rollback/,
  );
  assert.equal(
    (
      await post(
        { items: [item], voucherCode: 'BREW10' },
        200,
        alice.authorization,
      )
    ).voucherUsage.availableUses,
    3,
  );
  assert.equal(
    (
      await client.query(
        'SELECT count(*)::int AS count FROM voucher_usages WHERE "orderId"=$1',
        ['quota-rollback'],
      )
    ).rows[0].count,
    0,
  );
  await assert.rejects(
    client.query(
      'INSERT INTO voucher_usages ("orderId", "userId", "voucherCode", status) VALUES ($1,$2,$3,$4)',
      ['invalid-state', alice.userId, 'THU5K', 'INVALID'],
    ),
    (error) => error.code === '23514',
  );
  await assert.rejects(
    usageDataSource.transaction((manager) =>
      migration.down(manager.queryRunner),
    ),
    /Cannot revert voucher usages/,
  );
  const original = seeds.find((v) => v.code === 'BREW10');
  await client.query(
    'UPDATE vouchers SET "startsAt"=clock_timestamp()-interval \'2 days\', "endsAt"=clock_timestamp()-interval \'1 day\' WHERE code=$1',
    ['BREW10'],
  );
  assert.match(
    (await post({ items: [item], voucherCode: 'BREW10' }, 400)).message,
    /hết hạn/,
  );
  await client.query(
    'UPDATE vouchers SET "startsAt"=$1, "endsAt"=$2 WHERE code=$3',
    [original.startsAt, original.endsAt, 'BREW10'],
  );
  await client.query('UPDATE products SET price=45000 WHERE id=$1', [
    item.productId,
  ]);
  assert.equal(
    (await post({ items: [{ ...item, size: 'S', toppingIds: [], qty: 2 }] }))
      .subtotal,
    90000,
  );
  await stopApi();
  await startApi(databaseUrl, apiPort);
  assert.deepEqual(
    (
      await client.query(
        'SELECT code, "startsAt", "endsAt", "maxUsesPerUser" FROM vouchers ORDER BY code',
      )
    ).rows,
    seeds,
  );
  console.log(
    'INT-T50 passed: migrations/user FKs/revert safety, 4 seeds, guest/JWT quotes, invalid/expired JWT 401, per-account quota, 5 concurrent reservations/3 winners, mark/release replay, quota rollback, expiry, server prices, strict validation, restart stability, Swagger.',
  );
})()
  .catch((error) => {
    console.error(
      String(error.stack || error)
        .replaceAll(password, '[redacted]')
        .replaceAll(jwtSecret, '[redacted]'),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (usageDataSource?.isInitialized) await usageDataSource.destroy();
    if (client) await client.end();
    await stopApi();
    if (started) {
      const result = spawnSync('docker', ['stop', container], {
        encoding: 'utf8',
        windowsHide: true,
      });
      if (result.status !== 0) {
        console.error(
          `Could not stop test container ${container}; remove only this named test container manually.`,
        );
        process.exitCode = 1;
      }
    }
  });
