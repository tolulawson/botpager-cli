import { describe, expect, test } from "bun:test";
import { resolveDevice, ResolveError } from "./resolve";
import type { Config } from "./config";

const config: Config = {
  apiUrl: "http://127.0.0.1:8787",
  defaultDevice: "aaa",
  devices: [
    {
      deviceId: "aaa",
      token: "t1",
      deviceName: "Tolu’s iPhone",
      cliName: "iMac",
      alias: "Tolu’s iPhone",
      linkedAt: "2025-04-25",
    },
    {
      deviceId: "bbb",
      token: "t2",
      deviceName: "Work Phone",
      cliName: "Laptop",
      alias: "Work Phone",
      linkedAt: "2025-04-20",
    },
  ],
};

describe("resolveDevice", () => {
  test("exact id", () => {
    expect(resolveDevice(config, "bbb").deviceId).toBe("bbb");
  });

  test("exact name", () => {
    expect(resolveDevice(config, "Tolu’s iPhone").deviceId).toBe("aaa");
  });

  test("default when omitted", () => {
    expect(resolveDevice(config).deviceId).toBe("aaa");
  });

  test("no fuzzy match", () => {
    expect(() => resolveDevice(config, "Tolu")).toThrow(ResolveError);
  });

  test("BOTPAGER_DEVICE exact name when -d omitted", () => {
    const prev = process.env.BOTPAGER_DEVICE;
    process.env.BOTPAGER_DEVICE = "Work Phone";
    try {
      expect(resolveDevice(config).deviceId).toBe("bbb");
    } finally {
      if (prev === undefined) delete process.env.BOTPAGER_DEVICE;
      else process.env.BOTPAGER_DEVICE = prev;
    }
  });
});
