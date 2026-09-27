import { verify } from './platform-artifacts';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import pkg from '../package.json';
verify();
const tag = `v${pkg.version}`;
const sha = process.env.GITHUB_SHA!;
const gh = (args: string[]) => execFileSync('gh', args, { encoding: 'utf8' });
const releases = JSON.parse(gh(['api', `repos/${process.env.GITHUB_REPOSITORY}/releases?per_page=100`])) as { tag_name: string; assets: { name: string }[] }[];
const existing = releases.find(r => r.tag_name === tag);
const files = readdirSync('artifacts').filter(f => /\.(tgz|tar\.gz|zip)$/.test(f)).sort();
if (files.length !== 8) throw new Error('Expected npm tarball and seven platform archives');
writeFileSync('artifacts/SHA256SUMS', files.map(f => `${createHash('sha256').update(readFileSync(join('artifacts', f))).digest('hex')}  ${f}\n`).join(''));
writeFileSync('artifacts/release.json', JSON.stringify({ version: pkg.version, commit: sha, files }, null, 2) + '\n');
files.push('SHA256SUMS', 'release.json');
if (!existing) gh(['release', 'create', tag, '--draft', '--target', sha, '--title', `BotPager CLI ${tag}`, '--generate-notes']);
const temp = mkdtempSync(join(tmpdir(), 'botpager-release-'));
try {
 for (const file of files) {
   if (existing?.assets.some(a => a.name === file)) {
     gh(['release', 'download', tag, '--pattern', file, '--dir', temp]);
     if (!readFileSync(join(temp, file)).equals(readFileSync(join('artifacts', file)))) throw new Error(`Existing ${file} differs; refusing to overwrite. Reuse the original build artifacts or bump the version.`);
   } else gh(['release', 'upload', tag, join('artifacts', file)]);
 }
} finally { rmSync(temp, { recursive: true, force: true }); }
console.log(`Staged immutable release ${tag}`);
