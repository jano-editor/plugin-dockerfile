import { expect, test, describe } from "vite-plus/test";
import plugin from "../src/index.ts";

describe("jano-plugin-dockerfile", () => {
  test("has correct name and extensions", () => {
    expect(plugin.name).toBe("Dockerfile");
    expect(plugin.extensions).toContain("Dockerfile");
    expect(plugin.extensions).toContain(".dockerfile");
  });

  test("highlights Dockerfile instructions as keywords", () => {
    expect(plugin.highlight?.keywords).toContain("FROM");
    expect(plugin.highlight?.keywords).toContain("RUN");
    expect(plugin.highlight?.keywords).toContain("COPY");
  });

  test("onFormat uppercases instructions", () => {
    const ctx = {
      lines: ["from node:22", "run npm install", "copy . /app"],
      cursors: [{ position: { line: 0, col: 0 }, anchor: null }],
    };
    const result = plugin.onFormat?.(ctx as any);
    expect(result?.replaceAll).toEqual(["FROM node:22", "RUN npm install", "COPY . /app"]);
  });

  test("onFormat indents continuation lines", () => {
    const ctx = {
      lines: ["RUN apt-get update \\", "&& apt-get install -y curl \\", "&& rm -rf /var/lib/apt/lists/*"],
      cursors: [{ position: { line: 0, col: 0 }, anchor: null }],
    };
    const result = plugin.onFormat?.(ctx as any);
    expect(result?.replaceAll).toEqual([
      "RUN apt-get update \\",
      "  && apt-get install -y curl \\",
      "  && rm -rf /var/lib/apt/lists/*",
    ]);
  });

  test("onCursorAction indents after continuation line", () => {
    const ctx = {
      lines: ["RUN apt-get update \\", ""],
      action: {
        type: "newline",
        cursor: { position: { line: 1, col: 0 }, anchor: null },
        previousPosition: { line: 0, col: 20 },
      },
      cursors: [{ position: { line: 1, col: 0 }, anchor: null }],
    };
    const result = plugin.onCursorAction?.(ctx as any);
    expect(result?.edits?.[0].text).toBe("  ");
  });
});
