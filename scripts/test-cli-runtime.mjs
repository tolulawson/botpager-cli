import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Exercise the installed npm artifact with real child-process pipes and HTTP.
const executable = process.argv[2];
assert.ok(executable, 'Pass the installed botpager executable');
const directory = await mkdtemp(join(tmpdir(), 'botpager-runtime-'));
const requests = [];
const server = createServer(async (request, response) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  requests.push({ path: request.url, token: request.headers.authorization, body: JSON.parse(body || '{}') });
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ delivery: 'stored' }));
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const configPath = join(directory, 'config.json');
await writeFile(configPath, JSON.stringify({ apiUrl: origin, defaultDevice: 'test-device', devices: [
  { deviceId: 'test-device', token: 'test-only-token', deviceName: 'Phone', alias: 'Phone', cliName: 'Mac', linkedAt: '' },
] }));

async function run(args, input, apiUrl = origin) {
  const child = spawn(process.env.BOTPAGER_TEST_BINARY ? executable : process.execPath, process.env.BOTPAGER_TEST_BINARY ? args : [executable, ...args], {
    env: { ...process.env, BOTPAGER_CONFIG: configPath, BOTPAGER_API_URL: apiUrl, BOTPAGER_DEVICE: '' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.stdin.on('error', () => {});
  const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
  try {
    const closed = once(child, 'close');
    // Omitting input intentionally keeps stdin open until the child exits.
    if (input) await input(child.stdin);
    const [code, signal] = await closed;
    assert.equal(signal, null, `CLI timed out or crashed: ${args.join(' ')}\n${output}`);
    return { code, output };
  } finally { clearTimeout(timeout); child.stdin.destroy(); }
}

try {
  assert.equal((await run(['send', '--title', 'Task complete', '--kind', 'success'])).code, 0);
  assert.equal(requests.at(-1).body.body, '');
  assert.equal(requests.at(-1).body.title, 'Task complete');
  for (const text of ['--help', '--json', '--deployment-failed']) {
    assert.equal((await run(['send', '--', text])).code, 0);
    assert.equal(requests.at(-1).body.body, text);
  }
  for (const args of [['send'], ['send', '--title', 'Complete', '-']]) {
    assert.equal((await run(args, async (stdin) => {
      const bytes = Buffer.from('🚀');
      stdin.write(bytes.subarray(0, 2));
      await new Promise((resolve) => setTimeout(resolve, 25));
      stdin.end(bytes.subarray(2));
    })).code, 0);
    assert.equal(requests.at(-1).body.body, '🚀');
  }
  const count = requests.length;
  for (const args of [['pair'], ['send', 'test']]) {
    const result = await run(args, undefined, `http://localhost:${server.address().port}`);
    assert.equal(result.code, 1);
    assert.match(result.output, /BOTPAGER_CONFIG/);
  }
  assert.equal(requests.length, count, 'Cross-origin operations must not contact the server');
  assert.ok(requests.every((request) => request.token === 'Bearer test-only-token'));
  console.log('Packaged CLI runtime: 8 scenarios passed (pipes, UTF-8, literal options, server isolation).');
} finally {
  server.close();
  await rm(directory, { recursive: true, force: true });
}
