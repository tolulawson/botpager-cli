export interface ParsedArgs {
  command: string | undefined;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

const VALUE_FLAGS = new Set(["name", "d", "title", "priority", "kind", "project"]);

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  let command: string | undefined;
  let optionsEnded = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (optionsEnded) {
      if (!command) command = arg;
      else positionals.push(arg);
      continue;
    }
    if (arg === "--") {
      optionsEnded = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      flags.help = true;
      continue;
    }
    if (arg === "--json") {
      flags.json = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (VALUE_FLAGS.has(key)) {
        flags[key] = argv[++i] ?? "";
      } else {
        flags[key] = true;
      }
      continue;
    }
    if (arg.startsWith("-") && arg.length === 2) {
      const key = arg.slice(1);
      if (VALUE_FLAGS.has(key)) {
        flags[key] = argv[++i] ?? "";
      } else {
        flags[key] = true;
      }
      continue;
    }
    if (!command) {
      command = arg;
    } else {
      positionals.push(arg);
    }
  }

  return { command, positionals, flags };
}

export function flagString(flags: Record<string, string | boolean>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
