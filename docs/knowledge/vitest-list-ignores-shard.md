---
summary: '`vitest list --shard=i/n` ignores the shard and lists every file, so it cannot show how a split divides a suite; `--project` is honoured, which is how PR #206 split pragma'"'"'s CI job.'
triggers:
  commands:
    - 'vitest\b[^|;&]*\blist\b[^|;&]*--shard'
---

# `vitest list` ignores `--shard`

Vitest 4.1.11 accepts `--shard=<index>/<count>` on `vitest list` without a
warning and then lists the whole suite. Measured in `apps/borso-fr` on
2026-10-29:

```bash
pnpm exec vitest list --filesOnly              # 18 files
pnpm exec vitest list --filesOnly --shard=1/2  # 18 files
pnpm exec vitest list --filesOnly --shard=2/2  # 18 files
```

So a shard split cannot be checked by listing it. The only way to see what
`--shard=1/2` selects is to run it, which on pragma's back-e2e is minutes per
shard. On PR #206 the agent splitting `app-tests (pragma)` logged exactly that:
the shard split could not be checked without running the suite.

`--project` is honoured by `list`, and a project is a split whose files a
person chose rather than a hash:

```bash
cd apps/pragma
pnpm exec vitest list --filesOnly --project back-e2e             # 29 files
pnpm exec vitest list --filesOnly --project back-e2e-assistants  # 15 files
```

That is the shape PR #206 shipped: the OAuth and MCP database suites became the
`back-e2e-assistants` project, run in the `app-tests (pragma-assistants)` job.
A split that has to be predictable before it runs belongs in a project, not a
shard.

Related: [`pnpm-run-test-double-dash-drops-the-filter.md`](./pnpm-run-test-double-dash-drops-the-filter.md),
another Vitest argument dropped without a word.
