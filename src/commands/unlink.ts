import { api, ApiRequestError } from "../api";
import { loadConfig, removeDevice, saveConfig } from "../config";
import { resolveDevice } from "../resolve";

export async function unlinkCommand(ref: string | undefined): Promise<void> {
  if (!ref) {
    console.error("Usage: pagerbot unlink <ref>");
    process.exitCode = 1;
    return;
  }
  const config = loadConfig();
  const device = resolveDevice(config, ref);
  try {
    await api(config, "/v1/device", { method: "DELETE", token: device.token });
  } catch (err) {
    // Phone-initiated unlink already deleted the server record.
    if (!(err instanceof ApiRequestError && (err.status === 401 || err.status === 404))) {
      throw err;
    }
  }
  saveConfig(removeDevice(config, device.deviceId));
  console.log(`Unlinked ${device.alias} (${device.deviceId})`);
}
