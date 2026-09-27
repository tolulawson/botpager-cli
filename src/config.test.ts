import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig, upsertDevice } from "./config";

const prevConfig = process.env.BOTPAGER_CONFIG;
const prevApi = process.env.BOTPAGER_API_URL;

afterEach(() => {
  if (prevConfig === undefined) delete process.env.BOTPAGER_CONFIG;
  else process.env.BOTPAGER_CONFIG = prevConfig;
  if (prevApi === undefined) delete process.env.BOTPAGER_API_URL;
  else process.env.BOTPAGER_API_URL = prevApi;
});

describe("loadConfig", () => {
  test("missing file is empty, not an error", () => {
    process.env.BOTPAGER_CONFIG = join(mkdtempSync(join(tmpdir(), "bp-")), "missing.json");
    expect(loadConfig().devices).toEqual([]);
    expect(loadConfig().apiUrl).toBe("https://botpager-api.reostack.com");
  });

  test("corrupt JSON is not treated as empty", () => {
    const path = join(mkdtempSync(join(tmpdir(), "bp-")), "config.json");
    writeFileSync(path, "{not-json");
    process.env.BOTPAGER_CONFIG = path;
    expect(() => loadConfig()).toThrow();
  });

  test("link persist writes the resolved API URL", () => {
    const path = join(mkdtempSync(join(tmpdir(), "bp-")), "config.json");
    process.env.BOTPAGER_CONFIG = path;
    process.env.BOTPAGER_API_URL = "https://botpager-api.example.workers.dev";
    const next = upsertDevice({ ...loadConfig(), apiUrl: process.env.BOTPAGER_API_URL }, {
      deviceId: "aaa",
      token: "t",
      deviceName: "Phone",
      cliName: "Mac",
      alias: "Phone",
      linkedAt: "2026-01-01T00:00:00.000Z",
    });
    saveConfig(next);
    delete process.env.BOTPAGER_API_URL;
    expect(loadConfig().apiUrl).toBe("https://botpager-api.example.workers.dev");
    expect(loadConfig().defaultDevice).toBe("aaa");
  });
});
