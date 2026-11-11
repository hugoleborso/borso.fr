---
date: 2026-11-11
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#290'
fix-pr: none (the kaizen pull request for PR #290 carries it)
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-no-test-double-dash.sh, .claude/settings.json]
time-to-detect: days
tags: [hooks, harness, vitest, pnpm, self-improvement-loop]
zone: docs/knowledge/pnpm-run-test-double-dash-drops-the-filter.md
weak-point: gate-measures-nothing
recurs: [a-knowledge-entry-did-not-stop-the-second-hit]
---

# The warning about `test:e2e --` could not match `test:e2e`

## User impact

An agent on PR #290 asked for a few e2e files and got the whole suite.

| | Seen | Expected |
| --- | --- | --- |
| `pnpm --filter <app> run test:e2e -- <files>` | Vitest drops the file filter and runs every e2e file (logged by `one-line`) | The named files only, or a warning first |
| The knowledge entry written for this exact command on PR #193 | Silent | Printed before the call ran |

## Causal chain

- The agent ran the whole e2e suite.
  - No warning printed before the call.
    - The knowledge entry's trigger is `test(:[a-z-]+)?`, and the script name `test:e2e` holds a digit, so the class never matches it.
      - The trigger was written from the entry's summary, which names `test:e2e`, and never run against that command.

## Root cause of occurrence

*Thought a trigger that names the command recognises it, actually nothing ran
the trigger against the command it names.*

`docs/knowledge/pnpm-run-test-double-dash-drops-the-filter.md` summarises the
problem as "`pnpm run test:e2e -- <path>` passes the `--` on to Vitest", and
its trigger was `pnpm\b[^|;&]*\brun\s+test(:[a-z-]+)?\s+--\s`. Fed the exact
command, `grep -E` returns nothing (run 2026-11-11).

## Detection failure causes

- **`check-knowledge-triggers.sh`:** it checks that an entry has a trigger
  and that the regex compiles, not that it matches the moment it was written
  for.
- **The entry itself:** a trigger that never fires looks the same as a lesson
  nobody repeated. Its first miss read as the knowledge being ignored.

## Countermeasure

The trigger now reads `test(:[a-z0-9-]+)?`. That alone would print a warning.
It repeats after a printed knowledge entry already failed once on PR #75, so
the call is now refused.

## Eradication

**Type:** DevX check (level 2).

**Reference:** the kaizen branch for PR #290, commit `self`.

`.claude/hooks/pretool-no-test-double-dash.sh` refuses `pnpm … run test… --`
with the two forms that work, after stripping heredocs and quoted strings so a
commit message naming the command passes.

```diff
+if ! grep -qE 'pnpm\b[^|;&]*\brun[[:space:]]+test(:[a-z0-9-]+)?[[:space:]]+--([[:space:]]|$)' <<<"$COMMAND_TO_RUN"; then
+  exit 0
+fi
```

**Proof it can fail:** with `KAIZEN_LOG_REFUSALS=0`, the hook answers each
probe as below. With `[a-z-]` in place of `[a-z0-9-]`, the first answers 0.

```
2 <- pnpm --filter @borso-app/pragma run test:e2e -- api/src/x.test.ts
0 <- pnpm --filter @borso-app/pragma run test:e2e api/src/x.test.ts
0 <- git commit -m "never run test:e2e -- here"
2 <- pnpm run test:core -- --coverage
```

**Similar instances:** `grep -rn '\[a-z-\]' docs/knowledge/*.md` finds no
other trigger with a letters-only script class.
