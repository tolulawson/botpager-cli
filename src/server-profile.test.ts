import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { api } from "./api";
import { apiUrl, loadConfig, saveConfig, type Config } from "./config";
import { linkCommand } from "./commands/link";

const originalConfig = process.env.BOTPAGER_CONFIG;
const originalApi = process.env.BOTPAGER_API_URL;
const originalFetch = globalThis.fetch;
const originalLog = console.log;
let dir: string;
let requests: string[];
const config: Config = {
  apiUrl: "https://a.example", defaultDevice: "device-a",
  devices: [{ deviceId: "device-a", token: "token-issued-by-a", deviceName: "Phone A", alias: "Phone A", cliName: "Mac", linkedAt: "" }],
};
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "botpager-profile-"));
  process.env.BOTPAGER_CONFIG = join(dir, "a.json");
  process.env.BOTPAGER_API_URL = "https://b.example";
  saveConfig(config);
  requests = [];
  globalThis.fetch = (async (input: unknown) => {
    requests.push(String(input));
    return Response.json(String(input).endsWith("/start")
      ? { sessionId: "session-b", code: "TEST-CODE", qrPayload: "botpager://pair?code=TEST-CODE", expiresAt: new Date(Date.now() + 60000).toISOString() }
      : { status: "linked", deviceId: "device-b", token: "token-issued-by-b", deviceName: "Phone B" });
  }) as typeof fetch;
  console.log = () => {};
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  console.log = originalLog;
  if (originalConfig === undefined) delete process.env.BOTPAGER_CONFIG;
  else process.env.BOTPAGER_CONFIG = originalConfig;
  if (originalApi === undefined) delete process.env.BOTPAGER_API_URL;
  else process.env.BOTPAGER_API_URL = originalApi;
  rmSync(dir, { recursive: true, force: true });
});

test("cross-origin pairing is rejected before network access or saved credential changes", async () => {
  await expect(linkCommand("Mac")).rejects.toThrow("BOTPAGER_CONFIG");
  expect(requests).toEqual([]);
  expect(loadConfig()).toEqual(config);
});
test("API overrides cannot send an existing bearer token to a different origin", async () => {
  await expect(api(config, "/v1/send", { method: "POST", token: config.devices[0]!.token })).rejects.toThrow("another API server");
  expect(requests).toEqual([]);
});
test("a separate profile pairs with server B and makes B the default without modifying A", async () => {
  const profileA = process.env.BOTPAGER_CONFIG!;
  process.env.BOTPAGER_CONFIG = join(dir, "b.json");
  await linkCommand("Mac");
  delete process.env.BOTPAGER_API_URL;
  const paired = loadConfig();
  expect(paired.apiUrl).toBe("https://b.example");
  expect(paired.defaultDevice).toBe("device-b");
  expect(paired.devices.map((device) => device.token)).toEqual(["token-issued-by-b"]);
  expect(requests.every((url) => url.startsWith("https://b.example/"))).toBe(true);
  process.env.BOTPAGER_CONFIG = profileA;
  expect(loadConfig()).toEqual(config);
});
test("an equivalent origin with a trailing slash keeps existing pairings usable", () => {
  process.env.BOTPAGER_API_URL = "https://a.example/";
  expect(apiUrl(config)).toBe("https://a.example");
});
