---
name: after-task-dantotsus
description: Use after a PR has merged or closed to sweep through what happened during the task and produce one Dantotsu per interesting subject under `docs/knowledge/`. Implements CLAUDE.md's Self-improvement loop rule end-to-end. Triggered by the user saying any of "/after-task-dantotsus", "post-merge dantotsus", "kaizen pass on PR #N", "let's capture the lessons from that PR", or after the assistant receives a PR-merged webhook event in a session that was watching the PR. The skill identifies candidate subjects from the PR's commit history and conversation, classifies each (defect / vendor surprise / design pivot / operator confusion), and either invokes the `/dantotsu` skill per subject or writes the entries directly using the same template.
---

# After-task Dantotsu sweep

The closing move of every PR. CLAUDE.md's **Self-improvement loop**
rule says: when a PR merges or closes, capture the lessons. This
skill is the procedure.

## When to invoke

- A PR you've been working on just merged or closed.
- The user says any of: "/after-task-dantotsus", "kaizen pass",
  "post-merge dantotsus", "capture lessons from PR #N", "what should
  we add to docs/knowledge/ from that PR".
- A `<github-webhook-activity>` event reports a merge or close
  outcome on a PR you've been participating in.

## When NOT to invoke

- During the PR (use `/dantotsu` per defect instead, in real time).
- For trivial PRs with no debugging worth capturing — but still
  open a follow-up PR with a "no setup changes from PR #N" note so
  the loop's existence stays visible (per CLAUDE.md).
- For PRs that were closed without merging because the approach was
  wrong — instead, write ONE Dantotsu about the design misconception
  that led down the wrong path.

## The procedure

### 1. Inventory the PR

Build a list of "things that happened" from:

- **Commit history** on the PR branch (`git log --oneline <merge-base>..<head>`).
- **Force-pushed reverts** (`Revert "…"` commits — a common signal
  that an approach was tried, rejected, and replaced).
- **Review comments** on the PR (`mcp__github__pull_request_read`
  with method `get_review_comments`) — every back-and-forth thread
  is a candidate.
- **CI failures** during the PR (`mcp__github__pull_request_read`
  with method `get_check_runs`) — failed runs that were eventually
  green tell you something tripped a guard.
- **Webhook events** received during the session
  (`<github-webhook-activity>` blocks) — bot comments, status
  changes, deployment failures.
- **Conversation transcript** if the user agreed in chat that
  something was a pitfall ("oh, I didn't know X works that way").

Output: a flat list of `(subject, evidence)` pairs.

### 2. Classify each subject

For every candidate, decide:

| Class | Test | Skill action |
| --- | --- | --- |
| **Real defect** (we shipped or almost shipped a bug) | The fix went into the codebase or workflow files. | Full Dantotsu. `introduced-at` = `conception` / `implementation` / `self-validation` / `code-review`. |
| **Vendor surprise** (AWS, GitHub, pnpm, etc. behaved unlike its docs claim) | We worked around it but couldn't change the underlying behaviour. | Dantotsu with `introduced-at: n/a-vendor-knowledge`. The "misconception" is on our side: we believed the docs. |
| **Design pivot** (we tried approach A, abandoned it for B) | The PR has reverts, OR the user explicitly said "let's not do that". | Dantotsu about the conception-stage misconception that made A look right. |
| **Operator confusion** (a one-liner failed because of shell / CLI quirks, OR a doc was unclear) | The fix was a doc / convention, not code. | Short Dantotsu. Useful even if `severity: low` because it builds the operator's mental model of the toolchain. |
| **No-op** (already documented, or the PR shipped a clean win with no surprises) | The PR description matches reality, no debugging visible. | Skip. Open the follow-up PR with a "no setup changes from PR #N" note instead. |

Drop subjects that overlap — if two candidates trace to the same
root cause, write one Dantotsu and reference the second's evidence.
Be ruthless: ten thin Dantotsus help nobody; three sharp ones do.

### 3. Write the entries

For each subject that survives the filter:

1. Pick a slug `kebab-case`.
2. Copy `docs/knowledge/_template.md` to `docs/knowledge/<slug>.md`.
3. Fill the frontmatter using the evidence:
   - `date`: today's date.
   - `introduced-at`: from the classification table above.
   - `detected-at`: where the symptom was first observed in the
     defence-in-depth ladder.
   - `severity`: user-facing impact at detection.
   - `related-pr`: the PR being swept.
   - `fix-commit`: the SHA(s) that addressed it.
   - `time-to-detect`: rough estimate.
   - `tags`: pick from the existing tag pool first
     (`grep -h '^tags:' docs/knowledge/*.md | sort -u`); only add a
     new tag if no existing one fits.
4. Walk the seven Dantotsu steps from the `/dantotsu` skill body:
   pick → user-facing defect → causal chain → root cause of
   occurrence → detection failure causes → countermeasure →
   eradication. Even for `n/a-vendor-knowledge` entries, the
   structure holds — the "misconception" is "thought the docs
   matched reality, actually they don't".
5. Add a one-line entry to `docs/knowledge/README.md` index under
   the right heading.

### 4. Reference earlier related entries

Cross-link aggressively. If the new entry's chain ends in
"throttle then cleared after 10 min", link to the
`cloudfront-function-throttle-persistence` entry. The knowledge
base compounds in value when entries reference each other.

### 5. Open the follow-up PR

Branch name: `claude/lessons-from-pr-<N>` (replace N with the swept
PR's number).

Commit one-or-more commits scoped `docs:` (commitlint scope-enum).
PR title: `docs: lessons from PR #<N>`. PR body lists each entry
with a one-line summary so the reviewer can skim.

**Tag the PR with `kaizen`** so the loop is visible at a glance in
the issue/PR list. Use:

```
mcp__github__update_pull_request — labels: ["kaizen"]
```

(If the label doesn't exist yet on the repo, fall back to creating
it via `gh label create kaizen --color a2eeef --description
"Captures lessons from a previously-merged PR (Self-improvement loop)"`
and re-applying.)

### 6. Even if there are zero lessons

Still open the PR with a CLAUDE.md-aligned commit:
`docs: no setup changes from PR #<N>`. Body: one paragraph noting
what the PR shipped and confirming no defect / surprise / pivot /
operator-confusion came up worth capturing. The loop's
*existence*, not its volume, is what keeps the system improving.

## Output checklist before declaring done

- [ ] Inventory was built from commits + review comments + CI runs +
      webhooks, not just memory.
- [ ] Each subject is classified using the table; no-ops dropped.
- [ ] Each surviving subject has a file under `docs/knowledge/`
      that matches `_template.md` structure.
- [ ] Frontmatter on every new file is filled (no `<placeholder>`
      strings).
- [ ] `docs/knowledge/README.md` index updated.
- [ ] Cross-links to existing entries added where the chains
      overlap.
- [ ] Branch pushed, PR opened, `kaizen` label applied.
- [ ] PR body lists every entry with a one-line summary.

## Reframes

- **"This PR didn't have any bugs, so there's nothing to capture."**
  → Many of the most useful entries are vendor-knowledge gaps and
  design pivots, not bugs. Re-scan with that lens.
- **"The lesson is too small to be worth a file."**
  → If it cost any time during debugging, it's worth a 30-line
  entry. The next session will find it for free.
- **"I'll capture it later."**
  → No, you won't. The PR-merge moment is the moment context is
  freshest. The skill exists because this debt always slips.
