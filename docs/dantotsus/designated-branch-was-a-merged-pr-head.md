---
date: 2026-05-21
introduced-at: conception
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/24
fix-pr: https://github.com/hugoleborso/borso.fr/pull/<TBD>
fix-commits: []
eradication-level: 2
time-to-detect: hours
tags: [harness, orchestrator, conception, hooks]
---

# Orchestrator routed me to a branch that was already merged

## Symptom

The session-start system prompt said:

> _Develop on branch `claude/fix-dnf-validation-NIGKH`._

The agent checked out the branch, made two commits (SPA fallback
for `StaticSite`), and pushed. Two turns later, the user:

> _« Est-ce que tu avais correctement lu les commentaires sur la
> PR au fait ? En l'occurence elle a des merge conflicts, j'ai
> mergé autre chose depuis. »_

The conversation context was a kaizen follow-up to PR #23 (the
SPA-routing question, library-search comments, sanitiser knowledge
entry — all PR #23 leftovers). The natural home was
`claude/lessons-from-pr-23` (PR #24, open, kaizen for #23). The
orchestrator-prescribed branch `claude/fix-dnf-validation-NIGKH`
was PR #23's own head — closed and merged on 2026-05-15. Pushing
to it added orphan commits on a dead branch, while PR #24 silently
accumulated merge conflicts against `main` (PR #25 had landed in
the interim).

The user pulled back explicitly:

> _« Non mais tu devrais dev dans lessons-from-pr-23 ... »_

## Root-cause chain

1. **Why did the agent follow the prescribed branch without
   cross-checking?**
   The system prompt phrases the branch as a hard instruction
   (_"You are working on the following feature branches"_,
   _"NEVER push to a different branch without explicit
   permission"_). The agent read this as authoritative state, not
   as a hint that needed validation against the conversation.
2. **Why didn't the conversation context override the prescribed
   branch?**
   No procedural step in the agent's pre-commit flow says
   _"compare the prescribed branch's PR state to the conversation
   subject; if a closed-and-merged PR exists for this branch,
   stop and ask"_. The conversation was about kaizen subjects;
   the branch was a merged feature branch; the mismatch was
   visible to anyone who looked, but no step in the flow forces
   the look.
3. **Why did the harness pass a stale branch in the system
   prompt?**
   The orchestrator that routed the session re-used the branch
   from a prior task without checking the PR state. That's
   upstream and not directly fixable from this repo, but the
   _local_ defence — _"if HEAD is the merge commit of a closed
   PR, surface and confirm"_ — is implementable here.

**Root cause:** _thought_ the prescribed branch is the source of
truth, _actually_ the orchestrator's branch routing can be stale
when the previous task's branch already shipped. The agent's
pre-commit flow lacked a procedural anchor that catches the
mismatch _before_ the first push.

## Detection failure causes

- **Typing:** N/A.
- **Linter:** N/A.
- **Husky `pre-push`** — runs `pnpm exec knip` and does not check
  branch / PR state, so a push to a merged-PR branch sailed
  through.
- **CI:** the push to the closed branch did trigger a CI run, but
  CI doesn't know "this branch's PR is closed" — and the run
  succeeded, which is what's expected for new commits on top of
  a healthy ref.
- **Operator review:** would have caught this if a PR had been
  opened against the branch (there's no PR to review yet — the
  push went to a dead branch). The user did catch it within a
  couple of turns, which is fast, but the loop should be tighter.

## Countermeasure

Move the two commits across:

- Cherry-pick onto `claude/lessons-from-pr-23`.
- Rebase the resulting branch onto `origin/main` (resolves the
  pre-existing PR #25 conflict in `auth.controller.ts`).
- Force-push with `--force-with-lease`.

Commits on the original dead branch stay there, harmless and
ignorable — the user can delete the branch through the GitHub UI
once they're satisfied with the move.

- **Code (move):** commits `e3aacfd` → `06cf2fb` (chery-picked
  SPA fallback) and `2a4ecfc` (review-comment fixes) on
  `claude/lessons-from-pr-23`. Merged via PR #24.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2) — a SessionStart-time helper that
inspects HEAD and warns the agent if the checked-out branch
points at the merge commit of a closed PR. The agent's first
response in the next turn will see the warning in the SessionStart
hook output and ask the user before committing.

**Reference:** [PR #<TBD>](https://github.com/hugoleborso/borso.fr/pulls?q=is%3Apr+head%3Aclaude%2Flessons-from-pr-24) ·
this kaizen PR.

**The actual fix:**

A new script `scripts/check-branch-context.sh` (run by the
SessionStart hook from `scripts/install-repo-deps.sh`) that
prints a clear warning when HEAD's commit subject matches the
GitHub merge-commit pattern (`Merge pull request #<n>`):

```bash
# scripts/check-branch-context.sh (excerpt)
head_subject=$(git log -1 --pretty=%s 2>/dev/null || true)
if [[ "$head_subject" =~ ^Merge\ pull\ request\ #([0-9]+)\ from\  ]]; then
  pr_number="${BASH_REMATCH[1]}"
  printf '\n⚠️  branch-context check: HEAD is the merge commit of #%s.\n' "$pr_number"
  printf '   If you were routed here by an orchestrator instruction, the\n'
  printf '   branch may already be a merged PR. Confirm with the user that\n'
  printf '   this is the intended work surface before committing.\n\n'
fi
```

Wired in:

```diff
 # scripts/install-repo-deps.sh
+
+# 7. Branch-context check — flag when HEAD is the merge commit of a
+# closed PR. Stale orchestrator routing has shipped commits to dead
+# branches before; see
+# docs/dantotsus/designated-branch-was-a-merged-pr-head.md.
+"$REPO_ROOT/scripts/check-branch-context.sh" || true
```

The check is non-fatal (`|| true`) — its job is to surface the
state into the SessionStart output where the agent will see it,
not to refuse session boot.

**Sibling defects swept:** none in this kaizen, but the pattern
_orchestrator hands the agent a state the agent didn't verify_
also covers prior incidents around stale PR descriptions
(`orchestrator-shipped-with-stale-pr-description.md`) and stale
worktrees (worktree-drift inventory row in the PR #23 kaizen).
Each prior incident had its own narrow fix; this entry adds the
branch-state surface to the pattern.

## See also

- [`orchestrator-shipped-with-stale-pr-description.md`](./orchestrator-shipped-with-stale-pr-description.md) — sibling: orchestrator-driven state that wasn't re-verified by the agent.
- [`pushed-without-reading-pr-review-comments.md`](./pushed-without-reading-pr-review-comments.md) — sibling found in the same kaizen: the _next_ anchor along the pre-push flow.
