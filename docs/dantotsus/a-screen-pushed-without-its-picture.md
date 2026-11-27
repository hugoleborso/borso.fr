---
date: 2026-11-23
introduced-at: self-validation
detected-at: review
severity: low
related-pr: '#389'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/screens-shown.core.ts]
time-to-detect: hours
tags: [harness, hooks, agents, visual-validation, screenshots]
zone: .claude/skills/open-pr/SKILL.md
recurs: [the-screens-described-instead-of-shown]
---

# A screen pushed without its picture

## User impact

On PR #389 the operator asked for screenshots five times in one day, each
after a pushed change to a screen: "Remet les screenshots" ("put the screenshots
back") at 11:58, "screenshots please" at 13:10 and 15:31, "Et des screenshots ?"
("and screenshots?") at 15:53, and "Est-ce que tu as posté les sreenshots dans
la PR ????" ("did you post the screenshots in the PR????") at 16:25 (UTC, read
from the shipping session's transcript). The bid default had changed from a
dash to 0 in `f6e2a7a`, and the Screenshots comment gained the folder
`2026-11-23-1610` only after the fifth ask.

| | Seen | Expected |
| --- | --- | --- |
| After the push of `f6e2a7a` | The Screenshots comment still on the earlier folders | A folder showing the bid at 0 |

## Causal chain

- The operator could not see the change without opening the preview.
  - The session pushed and replied without uploading a screenshot.
    - The `screenshots.yml` run on that push re-rendered the comment from the
      folders already under `screenshots/pr-389/`, none of which showed the bid
      at 0.
    - The session expected the push alone to refresh the screenshots.
      - `/open-pr` step 5b ends with "Every later push to the pull request
        refreshes the comment on its own." PR #211 (`2e393f9`) wrote that
        sentence. It is true of the comment and silent on the folders.

## Root cause of occurrence

*Thought the Screenshots comment follows every push, actually it lists only the
folders uploaded so far.* **Material.** The sentence that closes step 5b reads as
"a push refreshes the screenshots", and it is still in
`.claude/skills/open-pr/SKILL.md` today.

## Detection failure causes

- **Hooks:** `stop-screens-shown-not-described.py` read the turn's text for a
  comparison claim, and this turn made none.

## Countermeasure

The same Stop hook now reads the turn's tool calls too. A turn that ran
`git push` over a range touching `apps/*/site/src/`, on a branch already
pushed, and uploaded no screenshot is blocked once with the reason.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file shipped it in
`.claude/hooks/stop-screens-shown-not-described.py`. Commit `458e886` (#411)
ported it to `scripts/hooks/checks/screens-shown.core.ts`.

```ts
const PUSH = /\bgit\s+push\b/u;
// ...
  '[screens-shown] This turn pushed a change to a screen and posted no new screenshot. ' +
  'Publish the changed screens as open-pr step 5b says. See docs/dantotsus/a-screen-pushed-without-its-picture.md.';
```

**Proof it can fail:** in a scratch clone pushed twice, the second push
changing `apps/x/site/src/A.tsx`, a turn whose only tool call is `git push`:

```
{"decision": "block", "reason": "[screens-shown] This turn pushed a change to a screen and posted no new screenshot. ..."}
```

The same turn with an `aws s3 cp ... screenshots/pr-1/...` call printed
nothing, and so did a run with `stop_hook_active`.

**Similar instances:** this is the third entry in the chain
[`described-screenshot-without-checking-pixels`](./described-screenshot-without-checking-pixels.md),
[`the-screens-described-instead-of-shown`](./the-screens-described-instead-of-shown.md),
then this one. Each was closed by widening the same Stop check. Watch the weak
point if a fourth comes.

**Proposed:** subtract the misleading sentence first. Rewrite the end of step 5b
in `.claude/skills/open-pr/SKILL.md` to say that a push re-renders only the
folders already uploaded, and that a changed screen needs a new upload. The next
reader then holds the right model before the Stop check has to catch them.
Beyond that, the preview deploy could capture the changed routes itself, so no
session has to remember. `.github/workflows/ci.yml` already installs Chromium
for Playwright (measured this session), so the browser exists in CI.
A capture step after each preview deploy is still a new cost for the operator to
decide on.
