import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Installation identity, shared by every server/profile for this OS user.
// Display names and push registrations are deliberately not identity.
export function computerIdentity(): string {
  const directory = join(homedir(), '.botpager');
  const path = join(directory, 'computer-id');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  try {
    writeFileSync(path, randomUUID() + '\n', { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
  const id = readFileSync(path, 'utf8').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`Invalid computer identity at ${path}. Restore the identity file before pairing.`);
  }
  return id.toLowerCase();
}
