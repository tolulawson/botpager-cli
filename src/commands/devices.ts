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
    console.log(`${mark} ${d.alias}${d.deviceModel && d.deviceModel !== d.alias ? ` (${d.deviceModel})` : ""}  ${d.deviceId}`);
  }
}
