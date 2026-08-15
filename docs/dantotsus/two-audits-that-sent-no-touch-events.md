---
date: 2026-08-15
introduced-at: conception
detected-at: review
severity: high
related-pr: '#50'
fix-pr: '#51'
fix-commits: [e792240, 2e581bc]
eradication-level: 2
time-to-detect: 14 hours
tags: [harness, tooling, ux, validation, claude-md, process]
---

# Two phone audits, six rounds, zero touch events

## Symptom

The operator asked for a phone UX audit driven with argent, the tool that sends
real touch input. Two audit-and-fix workflows ran, three rounds each, 22 agents,
about four million tokens. They found and fixed 63 real defects and reported not
one finding about touch.

The operator read a line in the summary about what headless Chromium could not
show and asked:

> What do you mean headless chromium ? Did you not use argent ??

Counting actual invocations across all 22 agent transcripts: **zero**.

## Root-cause chain

1. **Why did no agent use argent?** The workflow prompts told them not to. The
   first run's prompt said *"its gesture-tap is broken on this Chromium (CDP
   `Input.dispatchMouseEvent` times out) — use agent-browser for interaction"*.
   The second run's prompt did not mention argent at all.
2. **Why did the prompt say that?** It was copied from
   `docs/knowledge/driving-previews-with-agent-browser-and-argent.md`, which
   carried a section headed *"`gesture-tap` does not work on this Chromium"*,
   citing two independent reproductions.
3. **Why did that section exist?** Two earlier validation runs really did see
   `CDP request Input.dispatchMouseEvent timed out` on every call, and wrote it
   down as a property of the tool.
4. **Why was it wrong?** Both reproductions ran while `agent-browser` held a
   session on the same browser. The same file already documents that the two
   tools cannot share a browser, because Playwright owns the targets and
   argent's `Page.navigate`, `Runtime.evaluate` and input dispatch all time out
   against them. The observation was of the collision, not of the tool. Re-tested
   with a browser of argent's own, `gesture-tap` answers `{"tapped": true}` and a
   tap → keyboard → tap sequence logs in, opens a drawer, closes it, changes tab
   and leaves a full-screen view without one timeout.
5. **Why did nobody re-test in fourteen hours of audit work?** Because nothing
   ever re-tests a negative claim. A positive claim fails loudly the first time
   it is wrong — you run the command and it errors. A negative claim fails
   silently forever, because it stops anyone running the command.

**Root cause:** thought *"a knowledge entry recording two reproductions of a
tool failing is a fact about the tool"*, actually *"it is a fact about two runs,
and a negative claim carries no expiry, no owner and no re-test, so it outlives
its cause and quietly redirects every agent that reads it"*.

## Detection failure causes

- **Typing:** not applicable — prose in a markdown file.
- **Linter / static analysis:** nothing reads knowledge entries for claims that
  have gone stale. This is the gap the eradication closes.
- **Functional validation locally:** the audits validated the *app* thoroughly
  and never validated their own instrument. Each agent reported "argent was not
  used for any measurement" as a note, not as a limitation of the verdict.
- **CI:** the audits are not a CI job; nothing there could have noticed.
- **Code review:** the operator caught it, on reading one sentence about
  headless Chromium in a summary. Fourteen hours after the first round started.
- **PO / QA validation:** the operator's original instruction named argent
  explicitly. Nothing checked the work against that instruction — the reports
  read as complete because they were full of real findings.

## Countermeasure

- **Code:** commit `e792240` — the false section is withdrawn and replaced with
  the re-test, the probable cause of the original timeouts, and a header line
  saying that a task about touch is driven with argent because a synthetic click
  is not a tap.
- **Code:** commit `2e581bc` — `scripts/argent.sh` makes the correct setup one
  command, and the sweep corrects every other place the claim had spread:
  `.claude/agents/visual-validator.md` (which told every validation run to check
  touch with `agent-browser set device`, a call this repository's own knowledge
  says leaves `matchMedia('(pointer: coarse)')` false), the visual-validation
  standard, `docs/knowledge/agentic-device-testing.md`, the knowledge index, and
  three PR-40 validation records that keep their findings behind a correction
  banner.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — a gate rejects the misconception at commit time)

**Reference:** [PR #51](https://github.com/hugoleborso/borso.fr/pull/51) · commits
[`e792240`](https://github.com/hugoleborso/borso.fr/commit/e792240),
[`2e581bc`](https://github.com/hugoleborso/borso.fr/commit/2e581bc), plus
`scripts/check-negative-claims-are-dated.sh` on this branch

Correcting this one entry does not stop the next one. The class is *an undated
negative claim about a tool*, so the gate is about dating them:

```diff
+for doc in docs/knowledge/*.md; do
+  unquoted "$doc" | grep -qiE "$NEGATIVE_CLAIM_PATTERN" || continue
+  if ! grep -qE "$MARKER_PATTERN" "$doc"; then
+    printf '[negative-claims] FAIL %s says something does not work, with no date\n' "$doc"
+    failed=1
+  fi
+done
```

A knowledge entry that says a tool does not work must carry
`Last verified: YYYY-MM-DD — <how it was checked>`. The date is what lets the
next reader decide between believing it and spending two minutes re-testing;
without one, the only options are obey or re-derive from scratch, and every
agent so far has obeyed.

Deliberate limits, so the gate stays cheap and never fires spuriously:

- Quoted and code-spanned text is stripped before matching, because a quoted
  *"deploy is broken"* is somebody being wrong in a story, and a withdrawn claim
  quoted back is the correction itself.
- Age does not fail the build. A stale date is still an honest one, and a clock
  that reddens an unrelated pull request is friction with no matching benefit.
  Past 180 days it prints a warning where somebody is already reading.

Wired into `.husky/pre-commit` and `.github/workflows/ci.yml`, next to the other
one-directory greps.

**Sibling defects swept:** `.claude/agents/visual-validator.md` carried the same
shape of false instruction from a different source — it told every visual
validation run to check touch affordances with `agent-browser set device
"iPhone 14"`, contradicting `agent-browser-coarse-pointer-emulation.md` in the
same repository. Two documents disagreed and the wrong one was the one in the
execution path. It now routes touch through `scripts/argent.sh` or marks the row
UNVERIFIABLE.

## See also

- [`believed-the-bundle-readme-not-the-live-package-json.md`](./believed-the-bundle-readme-not-the-live-package-json.md)
  — the same shape: a document believed over an observation that was one command
  away.
- [`lectured-without-reading-the-code.md`](./lectured-without-reading-the-code.md)
  — asserting from memory rather than from the artefact.
- [`said-the-file-was-unreachable-without-looking.md`](./said-the-file-was-unreachable-without-looking.md)
  — same PR, same week: a capability declared impossible without probing it.
- [`docs/knowledge/driving-previews-with-agent-browser-and-argent.md`](../knowledge/driving-previews-with-agent-browser-and-argent.md)
  — the corrected recipe and the traps `scripts/argent.sh` now encodes.
