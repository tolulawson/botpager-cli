import type { Readable } from "node:stream";

export async function readMessage(
  positionals: string[],
  title?: string,
  stdin: Readable & { isTTY?: boolean } = process.stdin,
): Promise<string> {
  if (positionals[0] === "-" || (positionals.length === 0 && !title?.trim() && !stdin.isTTY)) {
    // The stream decoder retains incomplete UTF-8 sequences between chunks.
    stdin.setEncoding("utf8");
    let input = "";
    for await (const chunk of stdin) input += chunk;
    return input.trimEnd();
  }
  return positionals.join(" ").trim();
}
