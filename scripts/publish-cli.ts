import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import cliPackage from '../package.json';

// A rerun may follow a successful npm publish but failed GitHub release creation.
// Resume only when the existing registry artifact matches these exact bytes.
const tarball = `./artifacts/reostack-pagerbot-${cliPackage.version}.tgz`;
const integrity = `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`;
const url = `https://registry.npmjs.org/@reostack%2fpagerbot/${cliPackage.version}`;
const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
if (response.ok) {
  const published = await response.json() as { dist: { integrity: string } };
  if (published.dist.integrity !== integrity) throw new Error('Version already exists with different contents. Bump the package version.');
  console.log('The identical package is already published; continuing the release.');
} else if (response.status === 404) {
  execFileSync('npm', ['publish', tarball, '--access', 'public'], { stdio: 'inherit' });
} else {
  throw new Error(`Registry preflight failed: HTTP ${response.status}`);
}
// Do not report completion until the public registry contains the expected artifact.
let verified = false;
for (let attempt = 0; attempt < 6; attempt++) {
  const check = await fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(20_000) });
  if (check.ok) {
    const data = await check.json() as { dist: { integrity: string } };
    if (data.dist.integrity !== integrity) throw new Error('Published artifact integrity mismatch.');
    verified = true;
    break;
  }
  if (check.status !== 404) throw new Error(`Registry verification failed: HTTP ${check.status}`);
  await new Promise(resolve => setTimeout(resolve, 5000));
}
if (!verified) throw new Error('Package publication has not appeared in the registry; check before retrying.');
console.log('Verified the published package integrity.');
