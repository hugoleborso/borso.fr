---
date: 2026-08-15
introduced-at: self-validation
detected-at: review
severity: high
related-pr: '#50'
fix-commits: [e79224055f, 2e581bcfec, 67bf3a3d6, c54e32da7]
eradication-level: 2
eradication-paths: [scripts/check-negative-claims-are-dated.sh, scripts/phone.sh, .husky/pre-commit, .github/workflows/ci.yml]
time-to-detect: 14 hours
tags: [harness, tooling, ux, validation, claude-md, process]
zone: docs/knowledge/driving-previews-with-agent-browser-and-argent.md
recurs: [described-screenshot-without-checking-pixels]
---

# Two phone audits, six rounds, zero touch events

## User impact

The operator asked for a phone UX audit driven with argent, the tool that then
sent real touch input. Two audit-and-fix workflows ran, three rounds each, 22
agents, about four million tokens (measured from the workflow runs). They fixed
63 real defects and reported no finding about touch.

| | Seen | Expected |
| --- | --- | --- |
| argent invocations across the 22 agent transcripts | 0 (counted) | every touch check driven by argent |
| Touch findings | none | taps, drags and coarse-pointer layouts checked |

The operator read a line about what headless Chromium could not show and
asked:

> What do you mean headless chromium ? Did you not use argent ??

## Causal chain

- No audit agent sent a touch event.
  - The workflow prompts steered them away from argent. The first run's prompt
    said *"its gesture-tap is broken on this Chromium (CDP
    `Input.dispatchMouseEvent` times out) — use agent-browser for
    interaction"*. The second run's prompt did not mention argent.
    - The prompt copied a section of
      `docs/knowledge/driving-previews-with-agent-browser-and-argent.md`
      headed "`gesture-tap` does not work on this Chromium", citing two
      reproductions.
      - Commit `a6177d71d` (2026-08-08, written by an agent during a preview
        validation) added that section, with the observation that every
        `argent run gesture-tap` timed out:

        ```md
        +## `gesture-tap` does not work on this Chromium   ← the faulty line
        +
        +Two validation runs hit it independently. Every `argent run gesture-tap` returns
        ```

        - Both reproductions ran while `agent-browser` held a session on the
          same browser. Playwright owned the targets, so argent's input
          dispatch timed out. The observation was of the collision. Re-tested
          with a browser of argent's own, `gesture-tap` answered
          `{"tapped": true}` and a tap, keyboard, tap sequence logged in,
          opened and closed a drawer and changed tab without one timeout.
          - The setup let two drivers attach to one browser: argent took the
            port from `agent-browser get cdp-url` (Machine).

## Root cause of occurrence

*Thought a CDP timeout on every `gesture-tap` call was a property of the
tool, actually it was the documented collision of two drivers on one
browser.* **Man:** the right fact was in the agent's context. The same file
it edited already said, under "The two tools must not share one browser"
(`git show a6177d71d^:docs/knowledge/driving-previews-with-agent-browser-and-argent.md`,
line 101, read this session):

> `Page.navigate`, `Runtime.evaluate` and `Page.captureScreenshot` all return
> `CDP request … timed out`, because Playwright already owns those targets.

The prior "a timeout means the tool is broken" won over a paragraph a few
lines away. A Man cause is not answered by another document, so the
eradication below removes the collision (Machine) and gates the claim.

## Detection failure causes

- **Linter:** nothing read knowledge entries for a negative claim, so an
  undated "does not work" stood as fact. A positive claim fails the first time
  someone runs the command. A negative claim stops anyone running it.
- **Local validation:** the audits validated the app and not their own
  instrument. Each agent reported "argent was not used for any measurement" as
  a note, not as a limit of the verdict.
- **CI:** the audits are not a CI job.
- **Review:** the operator caught it on one sentence about headless Chromium,
  fourteen hours after the first round started.
- **QA:** the operator's instruction named argent. The reports read as
  complete because they were full of real findings, and nothing compared them
  with the instruction.

## Countermeasure

Commit `e792240` withdrew the false section and replaced it with the re-test.
Commit `2e581bc` added `scripts/argent.sh`, which gave argent its own browser
in one command, and corrected every place the claim had spread:
`.claude/agents/visual-validator.md`, the visual-validation standard,
`docs/knowledge/agentic-device-testing.md`, the knowledge index, and three
PR-40 validation records, now behind a correction banner.

## Eradication

**Type:** DevX check (level 2)

**Reference:** [PR #51](https://github.com/hugoleborso/borso.fr/pull/51),
commits [`e792240`](https://github.com/hugoleborso/borso.fr/commit/e792240),
[`2e581bc`](https://github.com/hugoleborso/borso.fr/commit/2e581bc) and
[`67bf3a3d6`](https://github.com/hugoleborso/borso.fr/commit/67bf3a3d6), then
[`c54e32da7`](https://github.com/hugoleborso/borso.fr/commit/c54e32da7) (#224).

Two mechanisms hold today.

1. **The collision is gone.** Commit `c54e32da7` (2026-10-29) deleted argent
   and `scripts/argent.sh` and added `scripts/phone.sh`. It sends
   `Input.dispatchTouchEvent` into agent-browser's own session (lines 2 to
   11), so no second driver competes for the browser's targets. Level 1 is not
   claimed: `scripts/browser/touch-tap.ts` still opens its own CDP connection
   to that browser, by design (`phone.sh:65-71`).
2. **An undated negative claim is refused.**
   `scripts/check-negative-claims-are-dated.sh` runs in `.husky/pre-commit`
   (line 336) and in `ci.yml` (line 141). A knowledge entry that says
   something does not work must carry `Last verified: YYYY-MM-DD`. Quoted and
   code-spanned text is stripped first. Age prints a warning past 180 days and
   never fails.

```diff
+for doc in docs/knowledge/*.md; do
+  unquoted "$doc" | grep -qiE "$NEGATIVE_CLAIM_PATTERN" || continue
+  if ! grep -qE "$MARKER_PATTERN" "$doc"; then
+    printf '[negative-claims] FAIL %s says something does not work, with no date\n' "$doc"
+    failed=1
+  fi
+done
```

**Proof it can fail:** planted on a scratch copy of `docs/knowledge/` on
2026-11-27, a file saying "`gesture-tap` does not work on this Chromium."
with no date. The gate answered, exit 1:

```
[negative-claims] FAIL docs/knowledge/planted.md says something does not work, with no date
```

**Similar instances:** `.claude/agents/visual-validator.md` told every visual
validation to check touch with `agent-browser set device "iPhone 14"`, which
`agent-browser-coarse-pointer-emulation.md` in the same repository says
leaves the pointer fine. Two documents disagreed and the wrong one was in the
execution path. It now routes touch through `scripts/phone.sh`. The same
shape, a document believed over one command, is in
[believed-the-bundle-readme-not-the-live-package-json.md](./believed-the-bundle-readme-not-the-live-package-json.md)
and
[said-the-file-was-unreachable-without-looking.md](./said-the-file-was-unreachable-without-looking.md).
