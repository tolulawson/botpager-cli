import { expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { readMessage } from "./message-input";

test("title-only does not consume or wait for an open pipe", async () => {
  const stream = new PassThrough();
  try {
    expect(await readMessage([], "Task complete", stream)).toBe("");
    expect(stream.readableFlowing).toBeNull();
  } finally { stream.destroy(); }
});
for (const [args, title] of [[[], undefined], [["-"], "Task complete"]] as const) {
  test(`UTF-8 split between writes is preserved (${title ? "explicit" : "automatic"} stdin)`, async () => {
    const stream = new PassThrough();
    const result = readMessage([...args], title, stream);
    const bytes = Buffer.from("🚀");
    stream.write(bytes.subarray(0, 2));
    await new Promise<void>((resolve) => setImmediate(resolve));
    stream.end(bytes.subarray(2));
    expect(await result).toBe("🚀");
  });
}
