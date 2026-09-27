import { loadConfig, saveConfig } from "../config";
import { resolveDevice } from "../resolve";

export function defaultCommand(ref: string | undefined): void {
  if (!ref) {
    console.error("Usage: pagerbot default <ref>");
    process.exitCode = 1;
    return;
  }
  const config = loadConfig();
  const device = resolveDevice(config, ref);
  saveConfig({ ...config, defaultDevice: device.deviceId });
  console.log(`Default device is now ${device.alias} (${device.deviceId})`);
}
