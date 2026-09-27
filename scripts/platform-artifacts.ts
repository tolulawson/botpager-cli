import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import pkg from '../package.json';
export const targets = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'linux-x64-musl', 'linux-arm64-musl', 'windows-x64'];
export const filename = (target: string) => target === 'npm' ? `reostack-botpager-${pkg.version}.tgz` : `botpager-${pkg.version}-${target}.${target === 'windows-x64' ? 'zip' : 'tar.gz'}`;
export const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const revision = process.env.GITHUB_SHA;
function identity(report: { revision: string; version: string }) {
 if (!revision || report.revision !== revision || report.version !== pkg.version) throw new Error('Artifact source identity mismatch');
}
export function verify() {
 for (const target of targets) {
  const report = JSON.parse(readFileSync(`artifacts/tested-${target}.json`, 'utf8'));
  identity(report);
  if (report.passed !== true || report.target !== target || report.file !== filename(target) || report.sha256 !== hash(`artifacts/${filename(target)}`)) throw new Error(`Untested release bytes: ${target}`);
 }
}
if (import.meta.main) {
 const [command, target] = process.argv.slice(2);
 if (command === 'verify') verify();
 else {
  if (![...targets, 'npm'].includes(target!)) throw new Error('Unknown target');
  const file = filename(target!);
  if (command === 'select') {
   if (process.argv.includes('--prepared')) {
    const manifest = JSON.parse(readFileSync('prepared/manifest.json', 'utf8'));
    identity(manifest);
    if (manifest.files[file]) {
     if (manifest.files[file] !== hash(`prepared/${file}`)) throw new Error('Corrupted prepared archive');
     copyFileSync(`prepared/${file}`, `artifacts/${file}`);
    }
   }
   const sha256 = hash(`artifacts/${file}`);
   writeFileSync(`artifacts/selected-${target}.json`, JSON.stringify({ revision, version: pkg.version, target, file, sha256 }));
   writeFileSync('artifacts/SHA256SUMS', `${sha256}  ${file}\n`);
  } else if (command === 'record') {
   const selected = JSON.parse(readFileSync(`artifacts/selected-${target}.json`, 'utf8'));
   identity(selected);
   if (selected.file !== file || selected.sha256 !== hash(`artifacts/${file}`)) throw new Error('Archive changed during tests');
   writeFileSync(`artifacts/tested-${target}.json`, JSON.stringify({ ...selected, passed: true }, null, 2));
  } else throw new Error('Unknown command');
 }
}
