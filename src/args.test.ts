import { expect, test } from "bun:test";
import { parseArgs } from "./args";

for (const literal of ["--help", "--json", "--deployment-failed"]) {
  test(`end-of-options preserves literal ${literal}`, () => {
    expect(parseArgs(["send", "--", literal])).toEqual({ command: "send", flags: {}, positionals: [literal] });
  });
}
test("options before the delimiter still work; all subsequent arguments stay literal", () => {
  expect(parseArgs(["send", "--title", "Done", "--", "--help", "--json", "-d", "--"]))
    .toEqual({ command: "send", flags: { title: "Done" }, positionals: ["--help", "--json", "-d", "--"] });
});
