import qrcode from "qrcode-terminal";
import { ApiRequestError, api, type PairSession, type PairStart } from "../api";
import { defaultCliName } from "../cli-name";
import { apiUrl, loadConfig, saveConfig, upsertDevice } from "../config";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function linkCommand(name?: string): Promise<void> {
  const config = loadConfig();
  const cliName = name?.trim() || defaultCliName();
  const started = await api<PairStart>(config, "/v1/pair/start", {
    method: "POST",
    body: JSON.stringify({ cliName, cliPlatform: process.platform }),
  });

  console.log(`\nLink this computer as "${cliName}"\n`);
  console.log("Scan the QR code in the PagerBot app, or enter this code:\n");
  console.log(`  ${started.code}\n`);
  qrcode.generate(started.qrPayload, { small: true });
  console.log("Waiting for the phone to claim…\n");

  // Worker keeps a linked session ≥120s after claim (PAIR_CLAIM_GRACE_SECONDS)
  // so this poll can pick up the one-time token. Slack past expiresAt matches that window.
  const deadline = Date.parse(started.expiresAt) + 125_000;
  while (Date.now() < deadline) {
    let session: PairSession;
    try {
      session = await api<PairSession>(config, `/v1/pair/session/${started.sessionId}`);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "SESSION_NOT_FOUND") {
        console.error("Code expired. Run pagerbot pair again.");
        process.exitCode = 1;
        return;
      }
      throw err;
    }
    if (session.status === "expired") {
      console.error("Code expired. Run pagerbot pair again.");
      process.exitCode = 1;
      return;
    }
    if (session.status === "linked" && session.deviceId && session.deviceName) {
      if (!session.token) {
        console.error(
          "Phone linked, but the pairing token was already consumed. Run pagerbot pair again.",
        );
        process.exitCode = 1;
        return;
      }
      const next = upsertDevice({ ...config, apiUrl: apiUrl(config) }, {
        deviceId: session.deviceId,
        token: session.token,
        deviceName: session.deviceName,
        cliName: session.cliName ?? cliName,
        alias: session.deviceName,
        linkedAt: new Date().toISOString(),
      });
      saveConfig(next);
      console.log(`Linked to ${session.deviceName} (${session.deviceId})`);
      return;
    }
    await sleep(1500);
  }

  console.error("Code expired. Run pagerbot pair again.");
  process.exitCode = 1;
}
