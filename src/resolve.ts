import type { Config, LinkedDevice } from "./config";

export class ResolveError extends Error {
  readonly refs: string[];
  constructor(ref: string, devices: LinkedDevice[]) {
    const refs = devices.flatMap((d) => [d.alias, d.deviceName, d.deviceId].filter(Boolean));
    super(
      devices.length
        ? `No device matches "${ref}". Valid refs:\n${devices
            .map((d) => `  ${d.alias}  ${d.deviceId}`)
            .join("\n")}`
        : `No device matches "${ref}". Pair a phone first with botpager pair.`,
    );
    this.refs = refs;
  }
}

export function resolveDevice(config: Config, ref?: string): LinkedDevice {
  const devices = config.devices;
  if (devices.length === 0) {
    throw new ResolveError(ref ?? "(none)", devices);
  }

  const target = ref || process.env.BOTPAGER_DEVICE || config.defaultDevice;
  if (!target) {
    throw new ResolveError("(none)", devices);
  }

  const byId = devices.find((d) => d.deviceId === target);
  if (byId) return byId;

  const byAlias = devices.filter((d) => d.alias === target);
  if (byAlias.length === 1) return byAlias[0]!;
  if (byAlias.length > 1) {
    throw new ResolveError(target, devices);
  }

  const byName = devices.filter((d) => d.deviceName === target);
  if (byName.length === 1) return byName[0]!;

  throw new ResolveError(target, devices);
}
