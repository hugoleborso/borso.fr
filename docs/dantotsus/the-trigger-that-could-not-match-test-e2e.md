---
date: 2026-11-11
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#290'
fix-commits: [self, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/no-test-double-dash.core.ts, scripts/hooks/checks/no-test-double-dash.core.test.ts]
time-to-detect: days
tags: [hooks, harness, vitest, pnpm, self-improvement-loop]
zone: docs/knowledge/pnpm-run-test-double-dash-drops-the-filter.md
weak-point: gate-measures-nothing
recurs: [a-knowledge-entry-did-not-stop-the-second-hit]
---

# The warning about `test:e2e --` could not match `test:e2e`

## User impact

An agent on PR #290 asked for a few e2e files and got the whole suite
(logged by `one-line` in the friction log).

| | Seen | Expected |
| --- | --- | --- |
| `pnpm --filter <app> run test:e2e -- <files>` | Vitest drops the file filter and runs every e2e file | the named files only, or a warning first |
| The knowledge entry written for this exact command on PR #193 | silent | printed before the call ran |

## Causal chain

- The agent ran the whole e2e suite.
  - The call passed `--` after `test:e2e`, and Vitest dropped the file
    filter that followed it.
  - The knowledge entry about that command printed nothing.
    - Its trigger,
      `pnpm\b[^|;&]*\brun\s+test(:[a-z-]+)?\s+--\s`, did not match the
      command. The script name `test:e2e` holds a digit, and `[a-z-]`
      excludes digits.
      - Commit `a83f0a600` (#200) wrote that trigger for
        `pnpm run test -- <path>`, the command its summary named then. The
        back-e2e script was still called `test`, so the class matched.
        - Commit `c54e32da7` (#224) renamed the back-e2e script to
          `test:e2e` and rewrote the entry's summary to
          "`pnpm run test:e2e -- <path>` passes the `--` on to Vitest". It
          kept the letters-only trigger two lines below.
          - The rewriting agent had the new command beside the regex and
            left a class that fits the usual shape of a script name, such
            as `test:unit` (Man).
            - Knowledge triggers are hand-written regexes, and the process
              for changing an entry ends when the regex compiles. It never
              pairs the regex with the moment it names (Method).

## Root cause of occurrence

*Thought `[a-z-]` covers the part of a script name after the colon, actually
`test:e2e` holds a digit.* (Man)

The right answer sat beside the regex in `c54e32da7`: that commit wrote the
summary "`pnpm run test:e2e -- <path>` passes the `--` on to Vitest" into the
same front matter as the trigger, and kept `[a-z-]`. The prior won.
So the fix cannot be one more sentence in the entry. It has to be a check that
holds when the prior wins. Fed the exact command, `grep -E` with the old
trigger returned nothing (run 2026-11-11).

## Detection failure causes

- **`scripts/check-knowledge-triggers.sh`:** it runs
  `scripts/knowledge-triggers.py check`, which verifies that an entry has a
  trigger and that each regex compiles in Python and in jq. It never matches
  a trigger against an example of its moment.
- **The entry itself:** a trigger that never fires looks the same as a lesson
  nobody repeated. Its first miss read as the knowledge being ignored.

## Countermeasure

The trigger now reads `test(:[a-z0-9-]+)?`. That alone would print a
warning. The class repeats after a printed knowledge entry already failed
once on PR #75, so the call is refused rather than warned about.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file, from PR #294. Commit `458e886c4`
(#411) moved the shell hook `.claude/hooks/pretool-no-test-double-dash.sh`
into `scripts/hooks/checks/no-test-double-dash.core.ts`, where it lives
today.

The `no-test-double-dash` check refuses a Bash call in which `pnpm ... run`
is followed by a test script and then `--`. It splits the command into
simple commands first, so a quoted mention passes:

```ts
const TEST_SCRIPT = /^test(:[a-z0-9-]+)?$/u;
...
      word === 'run' &&
      TEST_SCRIPT.test(args[index + 1] ?? '') &&
      args[index + 2] === '--',
```

**Proof it can fail:** `scripts/hooks/checks/no-test-double-dash.core.test.ts`
refuses `pnpm --filter pragma run test:e2e -- a.spec.ts` and lets through
`pnpm --filter pragma run test:e2e a.spec.ts` and `echo "pnpm run test -- x"`.
With `[a-z-]` in place of `[a-z0-9-]`, the first case passed (measured on
the shell version, 2026-11-11).

This holds for this command only. Any other knowledge trigger can still miss
its own moment.

**Proposed:** test each trigger against its moment. Each knowledge entry's
front matter would carry one example per trigger kind: the command, path or
output it must fire on. `scripts/knowledge-triggers.py check` would refuse an
entry whose triggers do not match their examples, in Python and in jq as it
already compiles them. A trigger that cannot match the moment it names would
then fail at commit, for every entry.

**Similar instances:** `grep -rn '\[a-z-\]' docs/knowledge/*.md` finds no
other trigger with a letters-only script class (run 2026-11-11).
