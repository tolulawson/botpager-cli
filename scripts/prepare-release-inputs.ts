// Only the release preparation job uses a write-enabled token to discover drafts.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import pkg from '../package.json';
import { targets, filename, hash } from './platform-artifacts';
const gh = (args: string[]) => execFileSync('gh', args, { encoding: 'utf8' });
const revision = process.env.GITHUB_SHA;
if (!revision) throw new Error('Missing source revision');
const releases = JSON.parse(gh(['api', `repos/${process.env.GITHUB_REPOSITORY}/releases?per_page=100`])) as { tag_name: string; target_commitish: string; assets: { name: string }[] }[];
const release = releases.find(r => r.tag_name === `v${pkg.version}`);
if (release && release.target_commitish !== revision) throw new Error('Existing release belongs to another source revision');
mkdirSync('prepared', { recursive: true });
const files: Record<string, string> = {};
for (const target of [...targets, 'npm']) {
 const file = filename(target);
 if (!release?.assets.some(a => a.name === file)) continue;
 gh(['release', 'download', release.tag_name, '--pattern', file, '--dir', 'prepared']);
 files[file] = hash(`prepared/${file}`);
}
writeFileSync('prepared/manifest.json', JSON.stringify({ revision, version: pkg.version, files }, null, 2));
