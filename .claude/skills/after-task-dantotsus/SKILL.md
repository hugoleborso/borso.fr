---
name: after-task-dantotsus
description: Use after a PR has merged or closed to sweep what happened during the task and produce one Dantotsu (under `docs/dantotsus/`) per real defect AND one Knowledge entry (under `docs/knowledge/`) per vendor surprise or reusable insight, then open a follow-up PR labelled `kaizen`. Implements CLAUDE.md's Self-improvement loop rule end-to-end. Triggered by the user saying any of "/after-task-dantotsus", "post-merge dantotsus", "kaizen pass on PR #N", "let's capture the lessons from that PR", or by a PR-merged webhook event in a session that was watching the PR. Hard rule — every Dantotsu in the output PR ships a code-level eradication (structural impossibility / DevX check / vendor patch / detection); knowledge-only is the last-resort floor and pure-knowledge subjects go to `docs/knowledge/` instead. Hard rule — agent never opens PRs against repos outside `hugoleborso/*`. The follow-up PR is the dev's sole and last goal between the merged PR and starting any new work — give it your all.
---

# After-task Dantotsu sweep → `kaizen` PR

The closing move of every PR. CLAUDE.md's **Self-improvement loop**
rule says: when a PR merges or closes, capture the lessons and open
a follow-up PR labelled `kaizen`. This skill is the procedure.

> **Output is always a PR labelled `kaizen`.** The label is the
> loop's visible signature in the repo — filter
> `is:pr label:kaizen` to see every iteration of the loop over time.

> **Hard quality bar:** every Dantotsu in the output PR ships a
> code-level eradication. No "captured as follow-up; not
> implemented yet". No issue creation as a substitute. The PR is
> the developer's sole and last goal between the merged work and
> starting anything new — invest accordingly.

## When to invoke

- A PR you've been working on just merged or closed.
- The user says any of: "/after-task-dantotsus", "kaizen pass",
  "post-merge dantotsus", "capture lessons from PR #N", "what
  should we add from that PR".
- A `<github-webhook-activity>` event reports a merge or close
  outcome on a PR you've been participating in.

## When NOT to invoke

- During the PR (use `/dantotsu` per defect instead, in real time).
- For trivial PRs with no debugging worth capturing — but still
  open the follow-up PR with a "no setup changes from PR #N" note
  so the loop's existence stays visible (per CLAUDE.md).

## The procedure

### 1. Inventory the PR

Build a list of "things that happened" from:

- **Commit history** on the PR branch (`git log --oneline <merge-base>..<head>`).
- **Force-pushed reverts** (`Revert "…"` commits — a common signal
  that an approach was tried, rejected, and replaced).
- **Review comments** on the PR
  (`mcp__github__pull_request_read` with method
  `get_review_comments`) — every back-and-forth thread is a
  candidate.
- **CI failures** during the PR
  (`mcp__github__pull_request_read` with method `get_check_runs`)
  — failed runs that were eventually green tell you something
  tripped a guard.
- **Webhook events** received during the session
  (`<github-webhook-activity>` blocks) — bot comments, status
  changes, deployment failures.
- **Conversation transcript** if the user agreed in chat that
  something was a pitfall ("oh, I didn't know X works that way").

Output: a flat list of `(subject, evidence)` pairs.

### 2. Classify each subject

For every candidate, decide:

| Class | Test | Output |
| --- | --- | --- |
| **Real defect** (we shipped or almost shipped a bug, or our code did the wrong thing) | The fix went into the codebase / workflows. | **Dantotsu** under `docs/dantotsus/`. Run [`/dantotsu`](../dantotsu/SKILL.md) per subject. Eradication is mandatory. |
| **Design pivot** (we tried approach A, abandoned it for B) | The PR has reverts or the user explicitly said "let's not do that". | **Dantotsu** about the conception-stage misconception that made A look right. Eradication: structural change so the abandoned approach is no longer expressible. |
| **Vendor surprise** (AWS, GitHub, pnpm, etc. behaved unlike its docs) | The behaviour is a fact of life of the underlying tool; nothing in our code is broken. | **Knowledge entry** under `docs/knowledge/`. No causal-chain ceremony required. |
| **Operator confusion** (a one-liner failed because of shell / CLI quirks) | The "fix" was a doc / convention, no code change. | **Knowledge entry** under `docs/knowledge/`. |
| **Reusable insight** (something the team should know but isn't really a defect) | We learned how something works; future contributors would benefit. | **Knowledge entry**. Knowledge is broad — anything genuinely useful. |
| **No-op** | PR shipped clean, no debugging visible. | Skip (but still open the kaizen PR with a "no setup changes from PR #N" note). |

Drop subjects that overlap — if two candidates trace to the same
root cause, write one entry and reference the second's evidence.
Be ruthless: ten thin entries help nobody; three sharp ones do.

### 3. Write the entries

For each surviving subject:

**Real defects / design pivots → `docs/dantotsus/<slug>.md`:**

1. Pick a slug `kebab-case` whose title sparks curiosity, not the
   user-story name.
2. Copy `docs/dantotsus/_template.md`.
3. Fill the frontmatter. Tag pool: `grep -h '^tags:'
   docs/dantotsus/*.md | sort -u` — only add a new tag if no
   existing one fits.
4. Walk the seven Dantotsu steps (see [`/dantotsu`](../dantotsu/SKILL.md)).
5. **Ship the eradication** — code, in this PR. Pick the highest
   feasible level of the ladder (1 = structural impossibility, 5 =
   knowledge as last resort). The frontmatter records
   `eradication-level`. Each entry links the commit SHA + diff
   snippet of the eradication.
6. Add a one-line entry to `docs/dantotsus/README.md` index.

**Vendor surprises / operator confusion / reusable insights →
`docs/knowledge/<slug>.md`:**

1. Pick a slug.
2. Write whatever helps the next reader. No frontmatter required;
   no fixed sections required. Keep it concrete and short.
3. Add a one-line entry to `docs/knowledge/README.md` index.

### 4. Cross-link

Cross-link aggressively. If the new dantotsu's chain ends in
"throttle then cleared after 10 min", link to the existing
`cloudfront-function-throttle-persistence` knowledge entry. The
corpus compounds in value when entries reference each other.

### 5. Open the follow-up PR with the `kaizen` label

Branch name: `claude/lessons-from-pr-<N>` (replace N with the swept
PR's number).

Commit one or more commits scoped `docs:` (commitlint scope-enum)
plus whatever code commits the eradications required. PR title:
`docs: lessons from PR #<N>`. PR body lists each entry with a
one-line summary so the reviewer can skim, plus a list of the
eradication commits.

**Apply the `kaizen` label.** This is non-optional — the label is
the visible signature of the self-improvement loop in the repo.

```
mcp__github__issue_write
  method: update
  issue_number: <new-pr-number>
  labels: ["kaizen"]
```

GitHub auto-creates the `kaizen` label the first time it's applied;
no separate label-creation call is needed. Re-applying is
idempotent. If you can't apply the label for any reason, surface
the failure to the user — don't merge a kaizen PR without the
label.

### 6. Even if there are zero lessons

Still open the PR with a CLAUDE.md-aligned commit:
`docs: no setup changes from PR #<N>`. Body: one paragraph noting
what the PR shipped and confirming no defect / surprise / pivot /
operator-confusion came up worth capturing. The loop's *existence*,
not its volume, is what keeps the system improving.

## Hard rules

- **No "captured as follow-up; not implemented yet"** in any
  Eradication section. Either implement it or pick a lower level
  that you can implement now.
- **No issue creation as a substitute for a code commit.** Issues
  drift; the loop dies.
- **Agent never opens PRs against repos outside `hugoleborso/*`.**
  For upstream patches, produce
  `patches/<lib>/<short-name>.{patch,md}` and stop. The human
  decides whether to send it upstream.
- **Every Dantotsu links its eradication commit + diff snippet.**
  No vague pointers; the reader can verify the fix landed.

## Output checklist before declaring done

- [ ] Inventory built from commits + review comments + CI runs +
      webhooks, not just memory.
- [ ] Each subject classified using the table; no-ops dropped.
- [ ] Each surviving real-defect / design-pivot subject has a file
      under `docs/dantotsus/` matching `_template.md`, with
      `eradication-level` ≥ 1 backed by a commit reference.
- [ ] Each surviving vendor-surprise / operator-confusion /
      reusable-insight subject has a file under `docs/knowledge/`.
- [ ] Frontmatter on every new dantotsu file is filled (no
      `<placeholder>` strings).
- [ ] Both READMEs updated.
- [ ] Cross-links to existing entries added where chains overlap.
- [ ] All eradication commits exist on the kaizen branch (verify
      `git log --oneline` shows them).
- [ ] Branch pushed, PR opened.
- [ ] **`kaizen` label applied to the PR** (verify via
      `mcp__github__pull_request_read method: get` — `labels`
      array should include `"kaizen"`).
- [ ] PR body lists every entry with a one-line summary plus the
      list of eradication commits.

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
- **"Knowledge is enough for this defect."**
  → Almost always wrong. Re-read the root cause and push for the
  highest level you can reach. Knowledge is the *floor*, not the
  default.
