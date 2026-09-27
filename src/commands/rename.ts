import { api } from "../api";
import { loadConfig, saveConfig } from "../config";
import { resolveDevice } from "../resolve";

export async function renameCommand(oldRef: string | undefined, nextName: string | undefined): Promise<void> {
  if (!oldRef || !nextName) {
    console.error("Usage: pagerbot rename <old> <new>");
    process.exitCode = 1;
    return;
  }
  const config = loadConfig();
  const device = resolveDevice(config, oldRef);
  const result = await api<{ deviceName: string; cliName: string }>(config, "/v1/device", {
    method: "PATCH",
    token: device.token,
    body: JSON.stringify({ deviceName: nextName }),
  });
  const devices = config.devices.map((d) =>
    d.deviceId === device.deviceId
      ? { ...d, deviceName: result.deviceName, alias: result.deviceName }
      : d,
  );
  saveConfig({ ...config, devices });
  console.log(`Renamed ${device.deviceId} → ${result.deviceName}`);
}
