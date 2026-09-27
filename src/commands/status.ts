import { apiUrl, loadConfig } from "../config";
import { resolveDevice } from "../resolve";

export async function statusCommand(asJson: boolean): Promise<void> {
  const config = loadConfig();
  let health: { ok?: boolean } | null = null;
  try {
    const res = await fetch(`${apiUrl(config)}/healthz`);
    health = (await res.json()) as { ok?: boolean };
  } catch {
    health = null;
  }

  let def = null;
  if (config.devices.length) {
    try {
      def = resolveDevice(config);
    } catch {
      def = config.devices[0] ?? null;
    }
  }
  const payload = {
    apiUrl: apiUrl(config),
    apiOk: health?.ok === true,
    devices: config.devices.length,
    default: def ? { name: def.alias, deviceId: def.deviceId } : null,
  };

  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(`API     ${payload.apiUrl}  ${payload.apiOk ? "ok" : "unreachable"}`);
  console.log(`Devices ${payload.devices}`);
  if (def) console.log(`Default ${def.alias}  ${def.deviceId}`);
}
