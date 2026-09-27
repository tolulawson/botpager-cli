import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

const [executableArg, origin, reportArg] = process.argv.slice(2);
assert(executableArg && origin && reportArg, 'Usage: node e2e-api.mjs <executable> <origin> <report>');
const executable = resolve(executableArg), reportPath = resolve(reportArg);
const dir = await mkdtemp(join(tmpdir(), 'botpager-e2e-'));
const config = join(dir, 'config.json');
const checks = [], children = new Set();
const report = { origin, artifactSha256: createHash('sha256').update(await readFile(executable)).digest('hex'), checks, pushDeliveryTested: false };
let token, deviceId;
const env = { ...process.env, HOME: dir, BOTPAGER_CONFIG: config, BOTPAGER_API_URL: origin, BOTPAGER_DEVICE: '' };
const delay = ms => new Promise(r => setTimeout(r, ms));
function run(args, input) {
  const child = spawn(executable, args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
  children.add(child);
  let output = '';
  child.stdout.on('data', b => { output += b; });
  child.stderr.on('data', () => {}); // Never log potentially sensitive CLI output.
  child.stdin.on('error', () => {});
  const timer = setTimeout(() => child.kill(), 120000);
  const done = new Promise((res, rej) => {
    child.on('error', rej);
    child.on('close', code => { clearTimeout(timer); children.delete(child); res({ code, output }); });
  });
  if (input !== undefined) child.stdin.end(input);
  return { done, output: () => output };
}
async function request(path, method = 'GET', body, authenticated = true) {
  const res = await fetch(origin + path, { method, headers: { 'x-botpager-client': 'cli', 'x-botpager-version': '0.3.0', 'x-botpager-protocol': '2', 'content-type': 'application/json', ...(authenticated && token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  return { status: res.status, body: await res.json() };
}
async function until(fn) {
  for (let i = 0; i < 45; i++) { const result = await fn(); if (result) return result; await delay(2000); }
  throw new Error('Propagation deadline exceeded');
}
async function check(name, fn) {
  const start = Date.now();
  try { await fn(); checks.push({ name, passed: true, durationMs: Date.now() - start }); }
  catch { checks.push({ name, passed: false, durationMs: Date.now() - start }); throw new Error(`Failed: ${name}`); }
}
try {
  await check('CLI version', async () => { const r = await run(['--version']).done; assert.equal(r.code, 0); assert.match(r.output.trim(), /^\d+\.\d+\.\d+$/); report.cliVersion = r.output.trim(); });
  await check('health', async () => { const h = await request('/healthz', 'GET', undefined, false); assert.equal(h.status, 200); assert.equal(h.body.ok, true); report.backendRevision = h.body.revision || 'local'; });
  await check('pair actual CLI with phone API', async () => {
    const pair = run(['pair', '--name', 'BotPager release verification']);
    const code = await until(() => pair.output().match(/\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/)?.[0]);
    const claim = await until(async () => { const c = await request('/v1/pair/claim', 'POST', { code, phoneId: randomUUID(), deviceName: 'CI ephemeral phone', platform: 'ios', pushToken: '' }, false); if (c.status === 404) return false; assert.equal(c.status, 200); return c.body; });
    token = claim.token; deviceId = claim.deviceId;
    assert.equal((await pair.done).code, 0);
    const saved = JSON.parse(await readFile(config, 'utf8'));
    assert.equal(saved.devices[0].deviceId, deviceId);
    assert.equal(saved.devices[0].token, token);
    await until(async () => (await request('/v1/messages')).status === 200);
  });
  const expected = [
    { args: ['send', '--json', '--title', 'Title only', '--kind', 'success'], title: 'Title only', body: '' },
    { args: ['send', '--json', '--title', 'Unicode', '-'], input: 'Deploy 🚀 café 日本語', title: 'Unicode', body: 'Deploy 🚀 café 日本語' },
    { args: ['send', '--json', '--', '--deployment-failed'], body: '--deployment-failed' },
  ];
  const ids = [], originals = [];
  for (const item of expected) await check(`send and retrieve: ${item.title || 'literal options'}`, async () => {
    const result = await run(item.args, item.input).done;
    assert.equal(result.code, 0);
    const sent = JSON.parse(result.output); assert.equal(sent.delivery, 'stored'); ids.push(sent.messageId);
    const message = await until(async () => { const h = await request('/v1/messages'); assert.equal(h.status, 200); return h.body.messages.find(m => m.id === sent.messageId); });
    originals.push(message);
    assert.equal(message.body, item.body); if (item.title) assert.equal(message.title, item.title);
  });
  await check('server idempotency', async () => {
    const r = await request('/v1/send', 'POST', { messageId: ids[0], title: 'Must not replace', body: 'Must not replace' });
    assert.equal(r.status, 200); assert.equal(r.body.delivery, 'duplicate');
    const h = await request('/v1/messages'); assert.equal(h.status, 200);
    const matches = h.body.messages.filter(m => m.id === ids[0]);
    assert.equal(matches.length, 1);
    for (const field of ['id', 'title', 'body', 'kind', 'project', 'deviceId', 'computerName', 'receivedAt']) {
      assert.deepEqual(matches[0][field], originals[0][field], `Duplicate changed ${field}`);
    }
  });
  await check('delete history', async () => { const r = await request('/v1/messages', 'DELETE', { ids }); assert.equal(r.status, 200); await until(async () => { const h = await request('/v1/messages'); return ids.every(id => h.body.deletedIds.includes(id)) && !h.body.messages.some(m => ids.includes(m.id)); }); });
  await check('unlink actual CLI and reject revoked credentials', async () => {
    assert.equal((await run(['unlink', deviceId]).done).code, 0);
    await until(async () => (await request('/v1/messages')).status === 401);
    const saved = JSON.parse(await readFile(config, 'utf8')); assert.equal(saved.devices.length, 0);
  });
  report.passed = true;
} catch (err) { report.passed = false; console.error(err.message); process.exitCode = 1; }
finally {
  for (const child of children) child.kill();
  if (token) {
    try { const r = await request('/v1/device', 'DELETE'); report.cleanup = [200, 401, 404].includes(r.status); }
    catch { report.cleanup = false; }
    if (!report.cleanup) { report.passed = false; process.exitCode = 1; }
  }
  await rm(dir, { recursive: true, force: true });
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`E2E report: ${reportPath}; passed=${report.passed}`);
}
