#!/usr/bin/env node
import { upgradeCommand } from "./commands/upgrade";
import pkg from "../package.json";
import { flagString, parseArgs } from "./args";
import { defaultCommand } from "./commands/default";
import { devicesCommand } from "./commands/devices";
import { linkCommand } from "./commands/link";
import { renameCommand } from "./commands/rename";
import { sendCommand } from "./commands/send";
import { statusCommand } from "./commands/status";
import { unlinkCommand } from "./commands/unlink";
import { ApiRequestError } from "./api";
import { ResolveError } from "./resolve";

const HELP = `botpager — page a paired phone

Usage:
  botpager upgrade [--check] [--json]
  botpager pair [--name <cliName>] [--json]
  botpager send [-d <ref>] [--title <title>] [--kind success|error|info|warning|other] [--project <name>] [--priority high|normal] [--json] [message|-]
  botpager devices [--json]
  botpager default <ref>
  botpager rename <old> <new>
  botpager unlink <ref>
  botpager status [--json]

Refs resolve by exact device id, then exact name. No fuzzy match.

Env:
  BOTPAGER_API_URL   API origin (default from ~/.botpager/config.json)
  BOTPAGER_DEVICE    Default device ref (overrides config default)
  BOTPAGER_CONFIG    Config path (default ~/.botpager/config.json)

`;

async function main(): Promise<void> {
  const { command, positionals, flags } = parseArgs(process.argv.slice(2));
  if (flags.version) { console.log(pkg.version); return; }
  if (!command || flags.help) {
    console.log(HELP);
    if (!command && !flags.help) process.exitCode = 1;
    return;
  }

  switch (command) {
    case "upgrade":
      await upgradeCommand(flags.check === true, flags.json === true);
      return;
    case "pair":
      await linkCommand(flagString(flags, "name"), flags.json === true);
      return;
    case "send":
      await sendCommand({
        ref: flagString(flags, "d"),
        title: flagString(flags, "title"),
        priority: flagString(flags, "priority"),
        kind: flagString(flags, "kind"),
        project: flagString(flags, "project"),
        json: flags.json === true,
        message: positionals,
      });
      return;
    case "devices":
      devicesCommand(flags.json === true);
      return;
    case "default":
      defaultCommand(positionals[0]);
      return;
    case "rename":
      await renameCommand(positionals[0], positionals[1]);
      return;
    case "unlink":
      await unlinkCommand(positionals[0]);
      return;
    case "status":
      await statusCommand(flags.json === true);
      return;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  const json = parseArgs(process.argv.slice(2)).flags.json === true;
  if (err instanceof ApiRequestError && err.code === "UPGRADE_REQUIRED") {
    const error = { code: err.code, message: err.message, ...err.requirements, currentVersion: pkg.version,
      upgradeCommand: "botpager upgrade --json", retryOriginalCommand: false };
    console.error(json ? JSON.stringify({ error }) : `${err.message}\nRun: botpager upgrade\nThen retry your original command.`);
    process.exitCode = 78;
    return;
  }
  if (json) {
    console.error(JSON.stringify({ error: { code: err instanceof ApiRequestError ? err.code : "COMMAND_FAILED", message: err instanceof Error ? err.message : String(err) } }));
    process.exitCode = 1;
    return;
  }
  if (err instanceof ResolveError || err instanceof ApiRequestError) {
    console.error(err.message);
  } else if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error(err);
  }
  process.exitCode = 1;
});
