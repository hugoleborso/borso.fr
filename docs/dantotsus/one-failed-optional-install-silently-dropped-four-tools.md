---
date: 2026-08-09
introduced-at: conception
detected-at: a-gate-that-skipped-itself
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-commits: []
eradication-level: 2
time-to-detect: months
tags: [tooling, hooks, session-start, actionlint, gates]
---

# One failed optional install silently dropped the four tools after it

## Symptom

A push printed

```
[pre-push] WARN: actionlint not installed — skipping.
```

and went through. The branch changed `ci.yml` and `preview.yml`, so the linter
whose entire purpose is checking those two files excused itself on precisely the
branch that needed it.

`scripts/install-repo-deps.sh` contains an actionlint installer, `~/.local/bin`
is on `PATH`, and the SessionStart hook runs the script. The binary had never
been installed anyway. Running the installer by hand explained why:

```
[install-repo-deps] rtk not found; installing from rtk-ai/rtk install.sh
[WARN] Redirect lookup failed, falling back to GitHub API...
curl: (22) The requested URL returned error: 403
[ERROR] Failed to get latest version (GitHub API may be rate-limited)
INSTALLER_EXIT=1
```

## Root-cause chain

1. **`rtk` is step 2 of eight, and its installer reads the GitHub API**, which
   answers 403 when rate-limited or proxied. That is an ordinary, expected
   network condition, not a broken machine.
2. **The script is `set -euo pipefail` with a `fail()` that exits 1.** A failing
   `rtk` aborts the whole run.
3. **Everything below step 2 therefore never ran**: the pnpm install, the AWS
   CLI, actionlint, agent-browser, the `/tmp/cdk.out` sweep that exists to stop
   the sandbox filling its disk, and the branch-context check. Six steps
   cancelled by one optional tool.
4. **Nothing said so.** The hook's output scrolls past at session start, the
   exit code is not surfaced anywhere, and each missing tool degrades
   independently and quietly somewhere else — as a warning in a gate, a `FAIL`
   row in a validator, an ENOSPC hours later.
5. **The one gate that noticed excused itself.** `pre-push` treated the missing
   binary as "not always installed, carry on", which is right on a branch that
   touches no workflow and wrong on one that does.

The blast radius was measured, not assumed: after the fix, the same run that
still fails on `rtk` installed `agent-browser 0.27.0`, which the aborting script
had also been skipping.

## Detection failure causes

- **An install script's exit code is nobody's gate.** SessionStart hooks are
  fire-and-forget; a non-zero exit produces no failure anywhere a human or an
  agent looks.
- **`set -e` is the right default for the required steps and the wrong one for
  the optional ones**, and the script did not distinguish. `jq` and `pnpm`
  genuinely should abort. `rtk` is a token-saving proxy whose absence costs
  tokens and breaks nothing.
- **Every consumer degraded politely.** The rtk hook passes commands through,
  the visual validator reports a `FAIL` row, `pre-push` warns. Each is sensible
  alone, and together they made a dead installer invisible.

## Countermeasure

Optional installs now run independently. Each records its own failure through
`note_missing`, and the script re-states the collected list at the end rather
than letting six quiet degradations stand in for one loud message:

```
[install-repo-deps] WARN: rtk did not install (…). The PreToolUse hook passes
                    commands through unrewritten, which costs tokens and breaks nothing.
[install-repo-deps] actionlint: 1.7.7
[install-repo-deps] agent-browser: agent-browser 0.27.0
[install-repo-deps] WARN: optional tools missing: rtk
[install-repo-deps] WARN: re-run ./scripts/install-repo-deps.sh once the network settles.
[install-repo-deps] done
```

Each warning states the consequence of *that* tool being absent, so the reader
does not have to know what `rtk` is to decide whether to care.

And `pre-push` no longer skips the workflow lint unconditionally. No workflow
touched, warn and continue as before. A workflow touched and no actionlint,
fail with the command that installs it.

## Eradication

**Level 2 — DevX check**, on both halves.

The installer completes despite the failure it used to abort on:

```
INSTALLER_EXIT=0     (was 1)
```

with `rtk` still failing its 403, and every later step running.

The gate refuses the branch it used to wave through. Simulated against this
branch's own diff, with actionlint absent:

```
workflows changed on this branch:
.github/workflows/ci.yml
.github/workflows/preview.yml
-> would FAIL the push
```

actionlint 1.7.7 was then installed and run over every workflow in the
repository: exit 0, no findings. So this closes a hole in the gate rather than a
defect in the workflows.

## What to check next time

When a gate says it is skipping itself, that is the finding — not a footnote on
the way to the thing you were doing. Ask why the tool is missing before deciding
whether the skip is tolerable, because the answer is often that something else
is missing too.

The narrower rule: in a bootstrap script, `set -e` must not span steps of
different necessity. Required dependencies abort; optional ones record and
continue, and the script says at the end what it could not install and what each
absence costs.
