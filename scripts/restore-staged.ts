// Reuse the exact staged bytes on retries, before testing or publication.
import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import pkg from '../package.json';
const gh = (args: string[]) => execFileSync('gh', args, { encoding: 'utf8' });
const tag = `v${pkg.version}`;
const list = JSON.parse(gh(['api', `repos/${process.env.GITHUB_REPOSITORY}/releases?per_page=100`])) as { tag_name: string; target_commitish: string; assets: { name: string }[] }[];
const release = list.find(r => r.tag_name === tag);
if (release) {
 if (release.target_commitish !== process.env.GITHUB_SHA) throw new Error('Existing release belongs to another source revision');
 for (const file of readdirSync('artifacts').filter(f => /\.(tgz|tar\.gz|zip)$/.test(f))) {
   if (!release.assets.some(a => a.name === file)) continue;
   rmSync(`artifacts/${file}`);
   gh(['release', 'download', tag, '--pattern', file, '--dir', 'artifacts']);
   console.log(`Reusing staged ${file}`);
 }
}
const archives = readdirSync('artifacts').filter(f => /\.(tgz|tar\.gz|zip)$/.test(f)).sort();
writeFileSync('artifacts/SHA256SUMS', archives.map(f => `${createHash('sha256').update(readFileSync(`artifacts/${f}`)).digest('hex')}  ${f}\n`).join(''));
