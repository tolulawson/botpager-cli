import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, renameSync, openSync, fsyncSync, closeSync, rmSync } from "node:fs";

export interface LinkedDevice {
  deviceId: string;
  token: string;
  deviceName: string;
  deviceModel?: string;
  platform?: string;
  cliName: string;
  alias: string;
  linkedAt: string;
}

export interface Config {
  apiUrl: string;
  defaultDevice?: string;
  devices: LinkedDevice[];
}

const DEFAULT_API = "https://botpager-api.reostack.com";

export function configPath(): string {
  return process.env.BOTPAGER_CONFIG || join(homedir(), ".botpager", "config.json");
}

function isMissingFile(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT";
}

export function loadConfig(): Config {
  const path = configPath();
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as Config;
    return {
      apiUrl: parsed.apiUrl || DEFAULT_API,
      defaultDevice: parsed.defaultDevice,
      devices: Array.isArray(parsed.devices) ? parsed.devices : [],
    };
  } catch (err) {
    if (isMissingFile(err)) return { apiUrl: DEFAULT_API, devices: [] };
    throw err;
  }
}

export function saveConfig(config: Config): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(temp, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
    const fd = openSync(temp, 'r');
    try { fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(temp, path);
  } finally { rmSync(temp, { force: true }); }
}

export function apiUrl(config: Config): string {
  const selected = (process.env.BOTPAGER_API_URL || config.apiUrl || DEFAULT_API).replace(/\/+$/, "");
  // A profile owns both the server address and its credentials. An environment
  // override must never redirect an existing pairing to a different server.
  if (config.devices.length && new URL(selected).origin !== new URL(config.apiUrl).origin) {
    throw new Error("This configuration is paired with another API server. Set BOTPAGER_CONFIG to a separate file and run botpager pair for the new server.");
  }
  return selected;
}

export function upsertDevice(config: Config, device: LinkedDevice): Config {
  const devices = config.devices.filter((d) => d.deviceId !== device.deviceId);
  devices.push(device);
  const next: Config = { ...config, devices };
  if (!next.defaultDevice) next.defaultDevice = device.deviceId;
  return next;
}

export function removeDevice(config: Config, deviceId: string): Config {
  const devices = config.devices.filter((d) => d.deviceId !== deviceId);
  const next: Config = { ...config, devices };
  if (next.defaultDevice === deviceId) {
    next.defaultDevice = devices[0]?.deviceId;
  }
  return next;
}
