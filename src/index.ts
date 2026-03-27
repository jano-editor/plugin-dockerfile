import type { LanguagePlugin, PluginContext, EditResult } from "@jano-editor/plugin-types";

const INSTRUCTIONS = [
  "FROM", "AS", "RUN", "CMD", "LABEL", "MAINTAINER", "EXPOSE", "ENV",
  "ADD", "COPY", "ENTRYPOINT", "VOLUME", "USER", "WORKDIR", "ARG",
  "ONBUILD", "STOPSIGNAL", "HEALTHCHECK", "SHELL",
];

const plugin: LanguagePlugin = {
  name: "Dockerfile",
  extensions: ["Dockerfile", ".dockerfile"],
  highlight: {
    keywords: INSTRUCTIONS,
    patterns: {
      comment: /#.*$/gm,
      string: /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g,
      number: /\b\d+\b/g,
      variable: /\$\{?\w+\}?/g,
      operator: /&&|\|\||;|\\$/gm,
    },
  },

  onCursorAction(ctx: PluginContext): EditResult | null {
    if (!ctx.action || ctx.action.type !== "newline") return null;

    const cursor = ctx.action.cursor;
    const curLine = cursor.position.line;
    const prevLine = curLine > 0 ? ctx.lines[curLine - 1] : "";

    // after continuation line (ends with \): indent
    if (/\\\s*$/.test(prevLine)) {
      const match = prevLine.match(/^(\s*)/);
      const base = match ? match[1] : "";
      // if previous line was already indented (continuation), keep same level
      // otherwise indent 2 spaces from the instruction
      const indent = base.length > 0 ? base : "  ";
      return {
        edits: [{
          range: { start: { line: curLine, col: 0 }, end: { line: curLine, col: 0 } },
          text: indent,
        }],
        cursors: [{ position: { line: curLine, col: indent.length }, anchor: null }],
      };
    }

    // after RUN, COPY, ADD etc. with no continuation: no indent
    return null;
  },

  onFormat(ctx: PluginContext): EditResult | null {
    const lines = [...ctx.lines] as string[];
    const formatted: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();

      // empty lines pass through
      if (trimmed === "") {
        formatted.push("");
        continue;
      }

      // comments: no indent
      if (trimmed.startsWith("#")) {
        formatted.push(trimmed);
        continue;
      }

      // continuation lines: indent with 2 spaces
      if (i > 0 && /\\\s*$/.test(lines[i - 1])) {
        formatted.push("  " + trimmed);
        continue;
      }

      // instruction lines: uppercase the instruction, no indent
      const instrMatch = trimmed.match(/^(\w+)(.*)/);
      if (instrMatch) {
        const instr = instrMatch[1].toUpperCase();
        if (INSTRUCTIONS.includes(instr)) {
          formatted.push(instr + instrMatch[2]);
          continue;
        }
      }

      // everything else: no indent
      formatted.push(trimmed);
    }

    return {
      replaceAll: formatted,
      cursors: [{ position: ctx.cursors[0].position, anchor: null }],
    };
  },
};

export default plugin;
