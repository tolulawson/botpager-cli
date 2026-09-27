import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import pkg from '../package.json';
const targets: Record<string, string> = {
  'darwin-arm64': 'bun-darwin-arm64', 'darwin-x64': 'bun-darwin-x64',
  'linux-x64': 'bun-linux-x64-baseline', 'linux-arm64': 'bun-linux-arm64',
  'linux-x64-musl': 'bun-linux-x64-baseline-musl', 'linux-arm64-musl': 'bun-linux-arm64-musl',
  'windows-x64': 'bun-windows-x64-baseline',
};
const target = process.argv[2]!;
if (!targets[target]) throw new Error('Unsupported binary target');
const temp = mkdtempSync(join(tmpdir(), 'botpager-build-'));
const dest = resolve('artifacts'); mkdirSync(dest, { recursive: true });
try {
 const binary = target.startsWith('windows') ? 'botpager.exe' : 'botpager';
 execFileSync('bun', ['build', '--compile', `--target=${targets[target]}`, './src/index.ts', '--outfile', join(temp, binary)], { stdio: 'inherit' });
 const name = `botpager-${pkg.version}-${target}.${target.startsWith('windows') ? 'zip' : 'tar.gz'}`;
 if (target.startsWith('windows')) {
   execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -LiteralPath '${join(temp, binary).replaceAll("'", "''")}' -DestinationPath '${join(dest, name).replaceAll("'", "''")}' -Force`], { stdio: 'inherit' });
 } else execFileSync('tar', ['-czf', join(dest, name), '-C', temp, binary]);
 const hash = createHash('sha256').update(readFileSync(join(dest, name))).digest('hex');
 writeFileSync(join(dest, `SHA256SUMS-${target}`), `${hash}  ${name}\n`);
 writeFileSync('VERSION', pkg.version + '\n');
} finally { rmSync(temp, { recursive: true, force: true }); }
