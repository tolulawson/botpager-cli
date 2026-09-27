#!/usr/bin/env node
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

const HELP = `pagerbot — page a paired phone

Usage:
  pagerbot pair [--name <cliName>]
  pagerbot send [-d <ref>] [--title <title>] [--kind success|error|info|warning|other] [--project <name>] [--priority high|normal] [--json] [message|-]
  pagerbot devices [--json]
  pagerbot default <ref>
  pagerbot rename <old> <new>
  pagerbot unlink <ref>
  pagerbot status [--json]

Refs resolve by exact device id, then exact name. No fuzzy match.

Env:
  PAGERBOT_API_URL   API origin (default from ~/.botpager/config.json)
  PAGERBOT_DEVICE    Default device ref (overrides config default)
  PAGERBOT_CONFIG    Config path (default ~/.botpager/config.json)

Existing BOTPAGER_* variables and ~/.botpager/config.json remain supported.
`;

async function main(): Promise<void> {
  const { command, positionals, flags } = parseArgs(process.argv.slice(2));
  if (!command || flags.help) {
    console.log(HELP);
    if (!command && !flags.help) process.exitCode = 1;
    return;
  }

  switch (command) {
    case "pair":
    case "link":
      await linkCommand(flagString(flags, "name"));
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
  if (err instanceof ResolveError || err instanceof ApiRequestError) {
    console.error(err.message);
  } else if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error(err);
  }
  process.exitCode = 1;
});
