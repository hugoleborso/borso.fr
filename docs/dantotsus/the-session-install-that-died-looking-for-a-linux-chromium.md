---
date: 2026-10-27
introduced-at: implementation
detected-at: local
severity: high
related-pr: none (the agent-browser block predates the gate that exposed it)
fix-pr: '#202'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/install-repo-deps.sh]
time-to-detect: weeks
tags: [harness, hooks, sandbox, tooling, meta, gates]
zone: scripts
weak-point: gate-measures-nothing
recurs: [cdk-destroy-failure-swallowed-by-trailing-or-echo]
---

# The session install that died looking for a Linux Chromium

## Symptom

A commit from a local macOS session was refused by pre-commit:

```
[check-claude-harness-active] this Claude Code session never ran borso.fr's .claude hooks.
Its project folder is not this clone, so SessionStart, the knowledge triggers,
the blueprint context and the guard hooks were all silent …
```

Every word of which was wrong except the first clause. The project folder *was*
this clone, and the knowledge triggers and the blueprint-context hook had been
printing all session. Running the acknowledgement the message asks for printed
the install and then exited 1, silently, leaving nothing recorded — so the same
refusal came back on the next commit.

## Root-cause chain

1. **Why was the commit refused?**
   `check-claude-harness-active.sh` looks for a session marker in the git
   directory and found none.
2. **Why was there no marker?**
   Only `SessionStart` writes it, through `session-start.sh`, which runs
   `install-repo-deps.sh` first and `--record` after.
3. **Why did `--record` not run?**
   `session-start.sh` is `set -euo pipefail`, and the install exited 1.
4. **Why did the install exit 1?**
   It looks for a bundled Chromium with
   `find "$browsers_root" … | sort | tail -n1`, where `$browsers_root` is
   `/opt/pw-browsers` — a path that exists in the Linux sandbox and on no Mac.
   `find` exits 1 on a missing directory; the `2>/dev/null` hides the message
   and `pipefail` promotes the status to the assignment, where `set -e` ends
   the script.
5. **Why did nobody notice an installer exiting 1 every session?**
   `SessionStart` output is not shown unless something asks for it, and the
   block is near the end of a long script whose visible work — pnpm install,
   the `@borso/infra` build, actionlint — had already printed success. The
   failure looks exactly like completion.
6. **Why did it surface now and not weeks ago?**
   It took a *second* mechanism to read the marker. The gate added for PR #194
   was the first thing that depended on the install reaching its last line.

**Root cause:** thought a `find` with `2>/dev/null` is a safe probe, actually
it is an exit status, and under `pipefail` it ends the script that was about to
do everything else.

## Detection failure causes

- **Linter / static analysis:** `shellcheck` does not flag a pipeline whose
  first command may legitimately fail; the silencing is on stderr, which looks
  deliberate because it is.
- **Functional validation locally:** the install's own output ends in
  `actionlint: 1.7.7`, a success line. A reader has no way to know four more
  steps were owed.
- **CI:** CI runs on Linux, where `/opt/pw-browsers` exists and `find` returns
  0. The failing platform is the one with no CI.
- **The gate that caught it:** it caught the consequence and named the wrong
  cause — it reports a session attached to another repository, which this was
  not, and its suggested fix exits 1 in exactly the same place.

## Countermeasure

- **Code:** the probe cannot end the script.
- **Operator action:** none. The marker records itself from the next session.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — the status that killed the script no longer
exists)

**Reference:** PR #202 · commit `self`

**The actual fix:**

```diff
-    chromium_binary=$(find "$browsers_root" … 2>/dev/null | sort | tail -n1)
+    chromium_binary=$(find "$browsers_root" … 2>/dev/null | sort | tail -n1 || true)
```

**What was never running on a Mac**, after that line and before `done`:

- the notice that `KAIZEN.md` already carries entries from an earlier task —
  which is how five unswept talos entries sat in it long enough to be found by
  this sweep;
- the blueprint-context lookups, generated synchronously because the pre-write
  hook is best-effort and exits 0 without them, so a file written on a Mac got
  no blueprint in front of it and nothing said so;
- the reports and architecture maps;
- the stale-branch check;
- `--record`, hence the refusal above.

Measured after the fix: the install exits 0 and prints those four lines, and
`--acknowledge` writes the marker.

**Sibling defects swept:** the same `/opt/pw-browsers` assumption is why
`scripts/browser.sh` fails on a Mac with no message, logged independently
during the talos work; the wrapper's own macOS path is not addressed here.

## See also

- [`cdk-destroy-failure-swallowed-by-trailing-or-echo.md`](./cdk-destroy-failure-swallowed-by-trailing-or-echo.md)
- [`borso-fr-attached-to-another-repositorys-session.md`](../knowledge/borso-fr-attached-to-another-repositorys-session.md)
- [`the-shell-gates-are-only-ever-run-where-they-pass.md`](../knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md)
