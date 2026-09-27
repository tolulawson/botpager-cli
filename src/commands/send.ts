import { api } from "../api";
import { loadConfig } from "../config";
import { resolveDevice } from "../resolve";

async function readMessage(positionals: string[]): Promise<string> {
  if (positionals[0] === "-" || (positionals.length === 0 && !process.stdin.isTTY)) {
    let input = "";
    for await (const chunk of process.stdin) input += chunk.toString();
    return input.trimEnd();
  }
  return positionals.join(" ").trim();
}

export async function sendCommand(opts: {
  ref?: string;
  title?: string;
  priority?: string;
  kind?: string;
  project?: string;
  json?: boolean;
  message: string[];
}): Promise<void> {
  const config = loadConfig();
  const device = resolveDevice(config, opts.ref);
  const body = await readMessage(opts.message);
  if (!body && !opts.title?.trim()) {
    console.error("Usage: pagerbot send [-d <ref>] [--title <title>] [--kind success|error|info|warning|other] [--project <name>] [message|-]");
    process.exitCode = 1;
    return;
  }
  const priority = opts.priority === "high" ? "high" : "normal";
  const kinds = ["success", "error", "info", "warning", "other"];
  if (opts.kind && !kinds.includes(opts.kind)) throw new Error(`Invalid message kind: ${opts.kind}`);
  const result = await api<Record<string, unknown>>(config, "/v1/send", {
    method: "POST",
    token: device.token,
    body: JSON.stringify({ messageId: crypto.randomUUID(), title: opts.title, body, priority, kind: opts.kind || "info", project: opts.project }),
  });
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`Saved for ${device.alias} (${device.deviceId}); ${result.delivery === "pushed" ? "push sent" : "available when the app opens"}`);
}
