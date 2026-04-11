# jano-plugin-dockerfile

Dockerfile syntax highlighting and formatting plugin for [jano editor](https://janoeditor.dev).

## Features

- Syntax highlighting for all Dockerfile instructions (FROM, RUN, COPY, etc.)
- Comment, string, number, variable and constant highlighting
- Auto-indent after continuation lines (`\`, respects editor tabSize)
- Toggle comment (Ctrl+/)
- Autocomplete: instructions with smart defaults, common base images (node, python, nginx, postgres...), snippets (multi-stage build, apt/apk install, non-root user, healthcheck)
- ARG/ENV variables from the file suggested as `$VAR` completions
- Auto-format (F3): uppercase instructions, indent continuations
- Validation: `:latest` tag warning, deprecated MAINTAINER, lowercase instructions, ADD vs COPY hint, missing FROM

## Install

```bash
jano plugin install jano-plugin-dockerfile
```

## Supported Files

- `Dockerfile`
- `*.dockerfile`

## License

MIT
