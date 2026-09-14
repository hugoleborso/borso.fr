---
date: 2026-09-14
introduced-at: conception
detected-at: operator-deploy
severity: high
related-pr: '#95'
fix-pr: '#97'
fix-commits: [5d14095]
eradication-level: 4
time-to-detect: days
tags: [claude-md, deploy, ci, harness, github, process, documentation]
---

# The gate for every production deploy was a sentence about what Claude could not do

## Symptom

Nothing broke. That is the problem.

The operator asked, in four words, for the pull request to be merged. Claude
merged it. Four applications deployed to production automatically, which is the
designed behaviour — and the design's entire justification had just been shown
to be false.

`CLAUDE.md` line 220, unchanged for months:

> **Prod app deploys run from CI on push to `main` automatically — no manual
> approval.** Since only the human can merge to `main` (Claude cannot), the
> merge *is* the gate

Claude can. It took one tool call, with no branch-protection refusal, no
permission error, and no hook in the way.

## Root-cause chain

1. **Why did the file say Claude cannot merge?**
   Because at the time nobody had tried. The sentence records an assumption
   about the harness — which tools the agent is given, what GitHub will refuse
   — made from inside the repository, which cannot see either.

2. **Why was it still there three weeks after being disproved?**
   This is the part that turns a stale sentence into a defect. On 2026-08-20
   someone *did* try, measured it, and wrote it down correctly in
   [`what-a-hosted-session-cannot-do-on-github.md`](../knowledge/what-a-hosted-session-cannot-do-on-github.md):

   > Merging to `main` worked, despite CLAUDE.md's standing note that only the
   > human merges — that note is a working agreement, not a permission
   > boundary.

   The entry names the contradiction, resolves it the right way, and changes
   nothing in the file it contradicts. Two documents in one repository
   disagreed for three weeks about whether a safety property held.

3. **Why did the wrong one win?**
   Because of which is read. `CLAUDE.md` is loaded into every session
   unconditionally; `docs/knowledge/` is a lookup nobody performs unless they
   already suspect the answer. The false claim was on the always-read path and
   the measured one was not, so the correction could not reach the decision.

4. **Why did it matter that it was load-bearing?**
   Because the surrounding paragraph spends the claim. It argues that no
   approval step is needed on the prod deploy *because* a human necessarily
   stands between any change and `main`. Remove the premise and the conclusion
   is an unguarded automatic deploy — which is a defensible choice for a
   one-person lab, but it is then a choice nobody made.

5. **Why could no gate here catch it?**
   Branch protection, environment reviewer rules and the agent's own tool list
   are all invisible to every test, lint and type in this repository. There is
   nothing to assert against.

6. **Why did the same file already know this?**
   It does. Its last "Don't" says: *"Don't describe a protection this
   repository cannot observe as if it were enforced."* It was written after
   `an-approval-gate-that-only-existed-in-a-comment.md` found the same shape in
   the `prod-shared` environment. The rule was added and the sentence one
   screen above it was never re-read against it.

**Root cause:** thought a safety property could be recorded by stating it in
the file every session reads, actually a statement about the harness cannot be
checked from inside the repository and its correction landed in a file nobody
reads unless they already doubt it — so the claim was disproved in writing
three weeks before it was relied on, and the reliance never saw the
disproof.

## Detection failure causes

- **Typing / linter / CI:** nothing here can read a branch-protection rule or
  the agent's tool list. The claim has no machine-checkable surface at all.
- **Code review:** the sentence was reviewed every time the paragraph around it
  changed, and reads as background fact rather than as a claim.
- **The repository's own rule:** present, correct, in the same file, and
  applied only to the new text that prompted it.
- **Knowledge:** the contradiction was measured, written down, and dated. It
  corrected a sentence in another file by describing it, which changes nothing
  that any reader of that file will see.

## Countermeasure

- **Code:** commit `5d14095` — the sentence is corrected, and the consequence
  it was standing in for is now printed at the moment of merging.
- **Operator action:** decide whether Claude merging `main` is wanted. Nothing
  here forbids it now; the hook makes the cost visible, which is what CLAUDE.md
  asks for in place of a confirmation step.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — a PreToolUse hook on the merge call itself)

**Reference:** [PR #97](https://github.com/hugoleborso/borso.fr/pull/97) ·
commit [`5d14095`](https://github.com/hugoleborso/borso.fr/commit/5d14095)

A confirmation prompt was the obvious fix and is ruled out: CLAUDE.md says not
to add friction to an owner-triggered deploy in a one-person lab, and to
**prefer making the consequence visible beforehand**. So the eradication prints
the consequence rather than asking about it.
`.claude/hooks/pretool-merge-deploys-prod.sh` fires on
`mcp__github__merge_pull_request`, names the applications the diff will deploy
to production, and says whether a `shared-deploy` dispatch is owed afterwards.
It always exits 0 — a gate that guessed at intent would be the confirmation
step the file rules out.

**The actual fix:**

```diff
+  Applications this diff touches: $APPS
+  shared-deploy dispatch owed:    $SHARED
+
+Merge only on an explicit instruction from the operator for THIS pull request.
```

Anything the local checkout cannot determine is reported as `unknown from this
checkout`, never as absent — a silent "no" is the failure being eradicated, one
layer down.

**Sibling defects swept:** the CLAUDE.md sentence itself, rewritten to say what
is true and checkable, and to carry the instruction the old one only implied —
never merge to `main` without being asked, for that pull request. The knowledge
entry that had been right since 2026-08-20 is now linked from it, so the two
cannot drift apart again silently. No other claim in that file asserts a
harness capability; the `prod-shared` reviewer claim was already corrected by
the dantotsu below.

## See also

- [`an-approval-gate-that-only-existed-in-a-comment.md`](./an-approval-gate-that-only-existed-in-a-comment.md)
  — the same shape, one paragraph away, found first. That one invented a
  reviewer rule; this one invented an incapability.
- [`a-knowledge-entry-did-not-stop-the-second-hit.md`](./a-knowledge-entry-did-not-stop-the-second-hit.md)
  — why the fix is a hook on the call and not another sentence.
- [`a-cache-replayed-the-error-its-own-entry-described.md`](./a-cache-replayed-the-error-its-own-entry-described.md)
  — the other entry from this sweep where a correct written rule failed to be
  read at the moment it applied. Two in one pull request is the pattern worth
  watching.
- [`../knowledge/what-a-hosted-session-cannot-do-on-github.md`](../knowledge/what-a-hosted-session-cannot-do-on-github.md)
  — the measurement that was right all along, and is now cited from CLAUDE.md
  rather than contradicting it.
