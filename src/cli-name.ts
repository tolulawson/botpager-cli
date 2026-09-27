import { hostname } from "node:os";
import { execSync } from "node:child_process";

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
