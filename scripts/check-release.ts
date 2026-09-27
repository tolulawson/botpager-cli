import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import cliPackage from '../package.json';

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version) || version !== cliPackage.version) {
  throw new Error(`Release version must match package.json (${cliPackage.version}); stable semver only.`);
}
if (process.env.GITHUB_REF !== 'refs/heads/main') {
  throw new Error('Run the release workflow from main.');
}
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const tag = `v${version}`;
const existing = execFileSync('git', ['tag', '--list', tag], { encoding: 'utf8' }).trim();
if (existing) {
  const tagged = execFileSync('git', ['rev-list', '-n', '1', tag], { encoding: 'utf8' }).trim();
  if (tagged !== sha) throw new Error(`${tag} already points to another commit; do not move published tags.`);
}
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\ntag=${tag}\nsha=${sha}\n`);
}
console.log(`Release ${cliPackage.name}@${version} from ${sha} as ${tag}`);
