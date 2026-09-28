import { hostname } from "node:os";
import { execFileSync, execSync } from "node:child_process";

export function defaultCliName(): string {
  if (process.platform === "darwin") {
    try {
      const name = execSync("scutil --get ComputerName", { encoding: "utf8" }).trim();
      if (name) return name;
    } catch {
      // fall through
    }
  }
  return hostname();
}

export function computerModel(): string {
  if (process.platform === 'darwin') {
    try {
      const info = JSON.parse(execFileSync('/usr/sbin/system_profiler', ['SPHardwareDataType', '-json'], { encoding: 'utf8', timeout: 3000 }));
      const model = info.SPHardwareDataType?.[0]?.machine_name;
      if (typeof model === 'string' && model.trim()) return model.trim().slice(0, 128);
    } catch { /* Hardware reporting must not prevent pairing. */ }
  }
  return 'Computer';
}
