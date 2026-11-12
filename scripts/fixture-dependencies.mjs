// Resolve installed packages through Node so fixtures also work with workspace hoisting.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { mkdirSync, readFileSync, symlinkSync } from 'node:fs';
const require = createRequire(import.meta.url);
export function linkFixtureDependencies(destination) {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  for (const name of Object.keys(pkg.dependencies || {})) {
    const target = join(destination, 'node_modules', name);
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(dirname(require.resolve(`${name}/package.json`)), target,
      process.platform === 'win32' ? 'junction' : 'dir');
  }
}
