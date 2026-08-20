---
date: 2026-08-20
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#64'
fix-pr: '#64'
fix-commits: []
eradication-level: 4
time-to-detect: hours
tags: [github-actions, ci, harness, hooks, self-improvement-loop]
---

# The entry that already said it, two days before it cost another hour

## Symptom

Pushes landed on the pull request's branch and no workflow ran. Not a failed
run, not a queued one — an empty checks list:

```
mcp__github__pull_request_read method:get_check_runs   {"total_count": 0}
mcp__github__pull_request_read method:get_status       {"state":"pending","total_count":0}
```

Other branches were running CI at the same minute, so Actions was plainly
alive. Two pushes, an hour apart, both silent. The session went looking for an
outage, a usage limit, disabled workflows, and a mis-matched trigger before
reading `mergeable_state` and finding `dirty`.

`docs/knowledge/a-conflicted-pull-request-gets-no-checks.md` had said exactly
this since 2026-08-18. It was written after the same trap cost a session on
PR #62. It is 60 lines long, it names `mergeable_state` in its second heading,
and it did not help.

## Root-cause chain

1. **Why did the session not read the entry?**
   Nothing pointed at it. `docs/knowledge/` has 60-odd files; you find the
   right one by already suspecting the answer.

2. **Why did the session not suspect a conflict?**
   Because the symptom argues against it. An empty checks list reads as
   *"nothing has happened yet"*, and a conflict reads as *"something is
   wrong"* — the pull request page shows the conflict banner, but the tool a
   session actually calls returns a number, and the number is zero.

3. **Why was a knowledge entry the eradication in the first place?**
   The PR #62 sweep classified it as a vendor surprise: GitHub behaves unlike
   its docs, nothing in our code is broken, so knowledge is the class. That
   classification is right and the conclusion still failed, because knowledge
   is only reachable by search and the search term is the answer.

4. **Why does that matter beyond this trap?**
   Because it is the general failure of level 5. The ladder in every dantotsu
   here calls knowledge *the floor*, and this is what the floor looks like when
   it gives way: the entry exists, is correct, is well written, and is not read
   at the moment it would help.

**Root cause:** thought writing the trap down eradicates it, actually a
knowledge entry is a lookup and the reader has to already suspect the answer to
look it up — so a trap whose symptom argues against its cause survives being
documented.

## Detection failure causes

- **Linter / static analysis:** nothing static can see a pull request's state.
- **CI:** the defect is the absence of CI, so CI cannot report it.
- **Code review:** the branch was reviewed five times; every reviewer read
  files, and none of them reads the pull request's mergeability.
- **Knowledge:** present, correct, unread. That is the whole dantotsu.

## Countermeasure

- **Operator action:** merge the base branch into the head, resolve, push. The
  checks come back on the next event.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — a PostToolUse hook that fires on the reading
itself)

**Reference:** [PR #64](https://github.com/hugoleborso/borso.fr/pull/64) — the
kaizen branch commits below.

The entry could not be found by someone who did not already know the answer, so
the eradication moves the sentence to where the wrong conclusion is formed: the
tool result. `.claude/hooks/posttool-empty-checks-means-conflict.sh` matches
`mcp__github__pull_request_read`, fires only when `total_count` is `0` on
`get_check_runs` or `get_status`, and names the one field that settles it. It
asserts nothing — a pull request can legitimately have no checks in its first
seconds — and it always exits 0, so it can never block a read.

**The actual fix:**

```diff
+TOTAL=$(jq -r '... | .total_count // empty' <<<"$RESPONSE")
+[ "$TOTAL" = "0" ] || exit 0
+
+cat <<NOTE
+[empty-checks] $METHOD returned no checks for pull request $PR.
+
+A conflicted pull request gets NO workflow run at all — GitHub cannot build
+refs/pull/<n>/merge, so there is nothing to report and nothing that says why.
+...
+  mcp__github__pull_request_read method:get  ->  .mergeable_state
+NOTE
```

**Sibling defects swept:** none — but the pattern generalises, and the next
sweep that is about to classify something as `knowledge` should ask whether the
symptom argues against the cause. When it does, level 5 is not enough.

## See also

- [`../knowledge/a-conflicted-pull-request-gets-no-checks.md`](../knowledge/a-conflicted-pull-request-gets-no-checks.md)
  — the entry this is about. Still the right place for the detail; the hook now
  carries the pointer.
- [`a-gate-that-reported-success-while-measuring-nothing.md`](./a-gate-that-reported-success-while-measuring-nothing.md)
  — the same shape one layer down: a signal that reads as "fine" when it means
  "nothing happened".
