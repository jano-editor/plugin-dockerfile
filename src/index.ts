import type {
  LanguagePlugin,
  PluginContext,
  KeyInfo,
  EditResult,
  CompletionItem,
  Diagnostic,
} from "@jano-editor/plugin-types";

// ----- Dockerfile Instructions -----

const INSTRUCTIONS = [
  "FROM", "AS", "RUN", "CMD", "LABEL", "MAINTAINER", "EXPOSE", "ENV",
  "ADD", "COPY", "ENTRYPOINT", "VOLUME", "USER", "WORKDIR", "ARG",
  "ONBUILD", "STOPSIGNAL", "HEALTHCHECK", "SHELL",
];

// ----- Common base images -----

const baseImages: CompletionItem[] = [
  { label: "node:22-alpine", kind: "constant", detail: "image" },
  { label: "node:22-slim", kind: "constant", detail: "image" },
  { label: "node:22", kind: "constant", detail: "image" },
  { label: "node:20-alpine", kind: "constant", detail: "image" },
  { label: "python:3.12-slim", kind: "constant", detail: "image" },
  { label: "python:3.12-alpine", kind: "constant", detail: "image" },
  { label: "golang:1.23-alpine", kind: "constant", detail: "image" },
  { label: "rust:1-slim", kind: "constant", detail: "image" },
  { label: "ubuntu:24.04", kind: "constant", detail: "image" },
  { label: "debian:bookworm-slim", kind: "constant", detail: "image" },
  { label: "alpine:3.20", kind: "constant", detail: "image" },
  { label: "nginx:alpine", kind: "constant", detail: "image" },
  { label: "nginx:latest", kind: "constant", detail: "image" },
  { label: "postgres:16-alpine", kind: "constant", detail: "image" },
  { label: "redis:7-alpine", kind: "constant", detail: "image" },
  { label: "mongo:7", kind: "constant", detail: "image" },
  { label: "mysql:8", kind: "constant", detail: "image" },
  { label: "busybox", kind: "constant", detail: "image" },
  { label: "scratch", kind: "constant", detail: "image" },
];

// ----- Completion: instructions with snippets -----

const instructionCompletions: CompletionItem[] = [
  { label: "FROM", insertText: "FROM ", kind: "keyword", detail: "base" },
  { label: "RUN", insertText: "RUN ", kind: "keyword", detail: "exec" },
  { label: "CMD", insertText: 'CMD [""]', kind: "keyword", detail: "exec" },
  { label: "COPY", insertText: "COPY . .", kind: "keyword", detail: "fs" },
  { label: "ADD", insertText: "ADD ", kind: "keyword", detail: "fs" },
  { label: "WORKDIR", insertText: "WORKDIR /app", kind: "keyword", detail: "dir" },
  { label: "EXPOSE", insertText: "EXPOSE ", kind: "keyword", detail: "net" },
  { label: "ENV", insertText: "ENV ", kind: "keyword", detail: "env" },
  { label: "ARG", insertText: "ARG ", kind: "keyword", detail: "arg" },
  { label: "ENTRYPOINT", insertText: 'ENTRYPOINT [""]', kind: "keyword", detail: "exec" },
  { label: "VOLUME", insertText: "VOLUME ", kind: "keyword", detail: "fs" },
  { label: "USER", insertText: "USER ", kind: "keyword", detail: "user" },
  { label: "LABEL", insertText: "LABEL ", kind: "keyword", detail: "meta" },
  { label: "HEALTHCHECK", insertText: "HEALTHCHECK CMD ", kind: "keyword", detail: "health" },
  { label: "STOPSIGNAL", insertText: "STOPSIGNAL ", kind: "keyword", detail: "sig" },
  { label: "SHELL", insertText: 'SHELL ["/bin/bash", "-c"]', kind: "keyword", detail: "shell" },
  { label: "ONBUILD", insertText: "ONBUILD ", kind: "keyword", detail: "hook" },
];

// common Dockerfile snippets
const snippetCompletions: CompletionItem[] = [
  {
    label: "Multi-stage build",
    insertText: 'FROM node:22-alpine AS builder\nWORKDIR /app\nCOPY . .\nRUN npm ci && npm run build\n\nFROM node:22-alpine\nWORKDIR /app\nCOPY --from=builder /app/dist ./dist\nCMD ["node", "dist/index.js"]',
    kind: "snippet",
    detail: "multi",
  },
  {
    label: "Install packages (apt)",
    insertText: "RUN apt-get update && apt-get install -y --no-install-recommends \\\n  && rm -rf /var/lib/apt/lists/*",
    kind: "snippet",
    detail: "apt",
  },
  {
    label: "Install packages (apk)",
    insertText: "RUN apk add --no-cache ",
    kind: "snippet",
    detail: "apk",
  },
  {
    label: "Non-root user",
    insertText: "RUN addgroup -S appgroup && adduser -S appuser -G appgroup\nUSER appuser",
    kind: "snippet",
    detail: "user",
  },
  {
    label: "HEALTHCHECK curl",
    insertText: 'HEALTHCHECK --interval=30s --timeout=3s --retries=3 \\\n  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1',
    kind: "snippet",
    detail: "health",
  },
  {
    label: ".dockerignore hint",
    insertText: "# Don't forget to create a .dockerignore file!",
    kind: "snippet",
    detail: "hint",
  },
];

// ----- Plugin -----

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
      constant: /\b[A-Z_][A-Z0-9_]{2,}\b/g,
    },
  },

  onKeyDown(key: KeyInfo, ctx: PluginContext) {
    // Ctrl+/ → toggle comment
    if (key.ctrl && key.name === "/") {
      const lines = [...ctx.lines];
      const affectedLines = new Set<number>();
      for (const c of ctx.cursors) {
        if (c.anchor) {
          const startY = Math.min(c.position.line, c.anchor.line);
          const endY = Math.max(c.position.line, c.anchor.line);
          for (let l = startY; l <= endY; l++) affectedLines.add(l);
        } else {
          affectedLines.add(c.position.line);
        }
      }
      const sorted = [...affectedLines].sort((a, b) => a - b);
      const allCommented = sorted.every((l) => lines[l].trimStart().startsWith("#"));
      for (const l of sorted) {
        if (allCommented) {
          const idx = lines[l].indexOf("#");
          const end = lines[l][idx + 1] === " " ? idx + 2 : idx + 1;
          lines[l] = lines[l].substring(0, idx) + lines[l].substring(end);
        } else {
          const m = lines[l].match(/^(\s*)/);
          const indent = m ? m[1].length : 0;
          lines[l] = lines[l].substring(0, indent) + "# " + lines[l].substring(indent);
        }
      }
      return {
        handled: true,
        edit: { replaceAll: lines, cursors: ctx.cursors.map((c) => ({ ...c })) },
      };
    }
    return null;
  },

  onCursorAction(ctx: PluginContext): EditResult | null {
    if (!ctx.action || ctx.action.type !== "newline") return null;

    const cursor = ctx.action.cursor;
    const curLine = cursor.position.line;
    const prevLine = curLine > 0 ? ctx.lines[curLine - 1] : "";
    const tabSize = ctx.settings.tabSize;

    // after continuation line (ends with \): indent
    if (/\\\s*$/.test(prevLine)) {
      const match = prevLine.match(/^(\s*)/);
      const base = match ? match[1] : "";
      const indent = base.length > 0 ? base : " ".repeat(tabSize);
      return {
        edits: [{
          range: { start: { line: curLine, col: 0 }, end: { line: curLine, col: 0 } },
          text: indent,
        }],
        cursors: [{ position: { line: curLine, col: indent.length }, anchor: null }],
      };
    }

    return null;
  },

  onComplete(ctx: PluginContext): CompletionItem[] | null {
    const cursor = ctx.cursors[0];
    if (!cursor) return null;

    const line = ctx.lines[cursor.position.line] ?? "";
    const trimmed = line.trim();

    // after FROM → suggest base images
    if (/^FROM\s+/i.test(trimmed)) {
      return baseImages;
    }

    // empty line or start of line → instructions + snippets
    const items: CompletionItem[] = [
      ...instructionCompletions,
      ...snippetCompletions,
    ];

    // add existing ARG/ENV names as variables
    for (const l of ctx.lines) {
      const argMatch = l.match(/^ARG\s+(\w+)/);
      if (argMatch) {
        items.push({ label: "$" + argMatch[1], kind: "variable", detail: "arg" });
      }
      const envMatch = l.match(/^ENV\s+(\w+)/);
      if (envMatch) {
        items.push({ label: "$" + envMatch[1], kind: "variable", detail: "env" });
      }
    }

    return items;
  },

  onFormat(ctx: PluginContext): EditResult | null {
    const lines = [...ctx.lines] as string[];
    const formatted: string[] = [];
    const tabSize = ctx.settings.tabSize;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();

      if (trimmed === "") {
        formatted.push("");
        continue;
      }

      if (trimmed.startsWith("#")) {
        formatted.push(trimmed);
        continue;
      }

      // continuation lines: indent
      if (i > 0 && /\\\s*$/.test(lines[i - 1])) {
        formatted.push(" ".repeat(tabSize) + trimmed);
        continue;
      }

      // instruction lines: uppercase the instruction
      const instrMatch = trimmed.match(/^(\w+)(.*)/);
      if (instrMatch) {
        const instr = instrMatch[1].toUpperCase();
        if (INSTRUCTIONS.includes(instr)) {
          formatted.push(instr + instrMatch[2]);
          continue;
        }
      }

      formatted.push(trimmed);
    }

    return {
      replaceAll: formatted,
      cursors: [{ position: ctx.cursors[0].position, anchor: null }],
    };
  },

  onValidate(lines: readonly string[]): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    let hasFrom = false;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === "" || trimmed.startsWith("#")) continue;

      // check for FROM
      if (/^FROM\s/i.test(trimmed)) {
        hasFrom = true;
      }

      // instruction should be uppercase
      const instrMatch = trimmed.match(/^(\w+)\s/);
      if (instrMatch && !trimmed.startsWith("#")) {
        const word = instrMatch[1];
        if (INSTRUCTIONS.includes(word.toUpperCase()) && word !== word.toUpperCase()) {
          diagnostics.push({
            line: i,
            col: 0,
            severity: "warning",
            message: `"${word}" should be uppercase: "${word.toUpperCase()}"`,
          });
        }
      }

      // MAINTAINER is deprecated
      if (/^MAINTAINER\s/i.test(trimmed)) {
        diagnostics.push({
          line: i,
          col: 0,
          severity: "warning",
          message: "MAINTAINER is deprecated, use LABEL maintainer=\"...\" instead",
        });
      }

      // latest tag warning
      if (/^FROM\s+\S+:latest/i.test(trimmed)) {
        diagnostics.push({
          line: i,
          col: trimmed.indexOf(":latest"),
          severity: "warning",
          message: "Avoid :latest tag — pin a specific version for reproducible builds",
        });
      }

      // ADD instead of COPY warning
      if (/^ADD\s/.test(trimmed) && !trimmed.includes("http") && !trimmed.includes(".tar")) {
        diagnostics.push({
          line: i,
          col: 0,
          severity: "info",
          message: "Consider using COPY instead of ADD for local files",
        });
      }
    }

    // no FROM instruction
    if (!hasFrom && lines.some((l) => l.trim() !== "" && !l.trim().startsWith("#"))) {
      diagnostics.push({
        line: 0,
        col: 0,
        severity: "error",
        message: "Dockerfile must start with a FROM instruction",
      });
    }

    return diagnostics;
  },
};

export default plugin;
