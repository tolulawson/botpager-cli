import { loadConfig } from "../config";

export function devicesCommand(asJson: boolean): void {
  const config = loadConfig();
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          defaultDevice: config.defaultDevice,
          devices: config.devices.map((d) => ({
            name: d.alias,
            deviceName: d.deviceName,
            deviceModel: d.deviceModel,
            platform: d.platform,
            deviceId: d.deviceId,
            cliName: d.cliName,
            linkedAt: d.linkedAt,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (config.devices.length === 0) {
    console.log("No linked devices. Run botpager pair.");
    return;
  }
  for (const d of config.devices) {
    const mark = d.deviceId === config.defaultDevice ? "*" : " ";
    const os = d.platform === 'ios' ? 'iOS' : d.platform === 'android' ? 'Android' : d.platform;
    const details = [d.deviceModel, os].filter(Boolean).join(' • ');
    console.log(`${mark} ${d.alias}${details && details !== d.alias ? ` (${details})` : ""}  ${d.deviceId}`);
  }
}
