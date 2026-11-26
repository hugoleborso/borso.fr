---
name: after-task-kaizen
description: Use after a PR has merged to sweep what happened during the task, write one Dantotsu (`docs/dantotsus/`) per real defect and one Knowledge entry (`docs/knowledge/`) per vendor surprise or reusable insight, and open a follow-up PR labelled `kaizen`. Triggered by "/after-task-kaizen", "kaizen pass on PR #N", "post-merge dantotsus", "capture the lessons from that PR", or by the kaizen task a merged PR's session started.
---

# After-task kaizen sweep → `kaizen` PR

The procedure behind CLAUDE.md's **Self-improvement loop**. During a PR, use
`/dantotsu` per defect instead.

## When to invoke

**First, decide whether a sweep is worth running.** It is when the task left
something to learn: a line in the archived friction log, an operator message
that corrected or redirected the session, a CI run that went red, or a FAIL or
UNVERIFIABLE row in a validation report. When none of these happened, run no
sweep and open no pull request. The merge reply says "No kaizen" with that
evidence. The operator asked for this after a sweep was offered for a PR with
none of them.

**Where it runs depends on the shipping session's context.** After the merge,
that session reads its own `get_session` `context_usage.used_tokens`.

- **Under 150,000 tokens**, it runs this sweep itself, in the same reply that
  reports the merge. The operator chose this threshold.
- **At 150,000 or more**, it archives its friction log, proposes the kaizen,
  and once the operator approves starts it in a new session, as `/open-pr`'s
  *After the merge* says.

Write the reading in the inventory's header line, so the sweep shows which
branch it took. When the operator says where to run it, that wins over the
threshold. Run it there without asking him to confirm.

**First call: `mcp__github__pull_request_read method: get`.** If `merged` is
not `true`, say so and stop. A prompt once said "merged" while the pull
request was still open and its archive was not on `main`.

## The procedure

Spend a long time on the problem before any solution. Step 1 is the heart of
the skill. Do it exhaustively, in writing, **before** classifying anything.
Fewer than about ten rows for a non-trivial PR means you are skimming, so
restart.

### 1. Build the friction inventory, exhaustive, not curated

Catalogue **every** moment of friction, one row each, from these sources:

- **The archived friction log (primary input).** `git fetch origin main`,
  then `scripts/kaizen.sh sweep-input <merge-sha>`. It prints, per archive
  the merge touched, the entry lines *this* merge added. Read that, not the
  path the prompt names. This session's own `KAIZEN.md` is not the input. Many
  lines resolve to `no-op: already eradicated by <existing entry>` once
  cross-checked against the corpus, and that cross-check is the point. A
  missing or empty archive is itself a row.
- **Every operator message of the shipping session.** The log holds only what
  the session chose to write down. Find the session from the `Claude-Session:`
  trailer of the PR's commits, then have one subagent list its transcript with
  the remote-session tool that lists a session's events, `kinds: ["user"]`,
  paging back with `before_id` until `has_more` is false. Then run
  `pnpm exec tsx scripts/kaizen/operator-messages.ts`, which prints the typed
  messages, the answers to questions, and every friction line the session
  logged, late ones included. Give each its own row, classified as a request
  the first brief could have carried, a correction of something shipped, a
  question the session should have asked first, or direction with no lesson.
  When no tool can read the transcript, say so in a row and ask the operator
  to paste their messages.

  **Read the writer, not only the line.** One agent hitting a wall is local.
  Several agents hitting the same wall is systemic and calls for a change to
  whatever they all read. Group the lines by writer and put the count in the
  row, because "three of five auditors logged this" is what promotes a
  knowledge entry into a gate. Entries logged as `main` from a task that
  spawned agents mean the agents were never told their label, which blinds
  the sweep to what they hit. Note it.
- **The shipping session's own turns**, when the sweep runs there. Walk them
  one by one, hook refusals and harness notices included, before reading the
  archive.
- **Open kaizen pull requests.** Read each open `kaizen`-labelled PR's
  `inventory.md`. A row another open sweep already eradicates is
  `merge into PR #<n>`, not a second fix.
- **The PR's conversation and review threads.** Every comment that corrects
  or redirects the session is a row.
- **Commit history.** Reverts, `--amend`-noisy stretches, and refactors right
  after a feat or fix.
- **CI runs** that went red, then green.
- **Validation reports** under `docs/features/<app>/<slug>/validation/`. Every
  FAIL or UNVERIFIABLE row.
- **Tooling, vendor and harness surprises.** Hook rejections, lint noise, AWS
  errors, documentation contradicted by observation, a skill that did not
  trigger, a path assumed instead of verified.

Commit the table to `docs/features/meta/lessons-from-pr-<N>/inventory.md`.
The PR body links it from *Inventory*, because the table cannot fit the body's
budget.

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | spec | … | <commit / report / chat snippet> | <what makes this friction possible at all> | <the problem in another place this friction is a symptom of, or `none` with why the cause is local> | dantotsu / knowledge / no-op (with one-line reason) |

**Elsewhere.** Where a friction is felt is rarely where it is made. A
validator that missed a bug may reveal a spec that never named the case. Name
that other problem with the file, skill, step or design choice it lives in.
When the cell names one, the decision targets it, not the friction.

**Cause.** Remove the cause, not the friction. The cell names what makes the
friction possible at all, such as a file every PR appends to, a step done by
hand, or two places that hold one rule. A `fixed:` or `dantotsu:` decision
removes it. A message or script that works around the friction leaves the
cause and adds one more thing to maintain. A guard that verifies a property
may ship beside the removal, never instead of it. If no removal is possible,
say so in the cell and ask the operator.

Conventions:

- `When`: `conception` / `spec` / `plan` / `implementation` / `validation` /
  `pr-description` / `deploy` / `post-merge`.
- `Friction`: one sentence from the user's side.
- `Sources / evidence`: at least one of `commit:<sha>`, `report:<path>`,
  `comment:<github-link>`, `transcript:<paraphrase>`, `ci:<run-url>`.
- `Decision`: one of:
  - `dantotsu: <slug>`, for a real defect, or a design pivot (approach A
    abandoned for B), whose entry is about the misconception that made A look
    right.
  - `knowledge: <slug>`, for a vendor surprise, a shell or CLI quirk, or a
    reusable insight with no defect.
  - `merge into <slug>`, covered by another row's entry.
  - `fixed: <commit>`, a small change with no entry, shipped in the kaizen PR.
  - `no-op: <reason>`, already eradicated upstream or genuinely too small. A
    reason that names a change is not a no-op. "Worth a line in the hook's
    message" is a fix, so make it here and record `fixed: <commit>`.

**Hard floor: every row has a decision. No `?` cells.**

### 1b. Measure what the pull request cost

Write `docs/features/meta/lessons-from-pr-<N>/cost.md`, one row under the
header of `docs/quality/feature-cost.md`, by the sources its *Targets* table
names. The row lives in the sweep's own folder because a shared table made
parallel sweeps collide.

### 1c. Stamp the ADRs the merge shipped

`git diff --name-only <merge>^ <merge> -- docs/adr/` lists the ADRs the PR
added. Set each one still `- **Status:** proposed` to `accepted`, as `/adr`'s
lifecycle says. No other step does it.

### 2. Re-read the table top to bottom, only now classify

Patterns show across rows. Three rows of "I assumed X without asking" call for
one change to the spec skill, not three dantotsus. Fold overlaps with
`merge into <slug>`. Three sharp entries beat ten thin ones.

### 3. Write the entries

**Real defects and design pivots.** Write each with
[`/dantotsu`](../dantotsu/SKILL.md) in fix mode, and ship its eradication as
code in this PR. Take a tag from `grep -h '^tags:' docs/dantotsus/*.md | sort -u`
when one fits. Feed a guard hook its proof with `KAIZEN_LOG_REFUSALS=0`, or
the proof lands in `KAIZEN.md` as friction. Never add a check that only guards
the harness.

- **A mechanism that changes how the operator works is his call.** That is one
  that changes when he is asked for something, when CI or a preview runs, or
  what a session waits for. Write its entry in analysis mode, ask him one
  closed question, and build only the option he picks.
- **No option hands the operator a task per pull request**, such as a manual
  check or a device walk-through. Ship a detection that needs nobody, such as
  a check the app runs on itself and reports to Sentry.

**Vendor surprises and reusable insights.** Extend an entry on the same tool
or symptom (`grep -ril <tool> docs/knowledge/`) before writing a second one.
Follow [`docs/knowledge/README.md`](../../../docs/knowledge/README.md), and
take the `triggers:` from the inventory row, at the moment the subject bit.

Link each new entry to the existing ones its chain touches.

### 4. Open the follow-up PR with the `kaizen` label

Branch `claude/lessons-from-pr-<N>`, title `docs: lessons from PR #<N>`,
`docs:` commits plus whatever code the eradications need.

**The sweep removes at least as much as it adds.** After the last commit, run
`scripts/kaizen.sh balance` and paste its line under the body's description.
When it refuses, remove what each addition replaces: fold an entry into one
that exists, delete the check or text the new mechanism makes redundant. CI
(`kaizen-balance`) and `pre-push` run the same command. A removal is the only
answer to its refusal.

Once the friction log is archived, `pnpm exec tsx
scripts/quality/working-conditions.ts --check` must pass. Three unfiled lines
about one wall are a wall to add to `docs/quality/working-conditions.md`.

Draft the body from [`template.md`](./template.md) and check it with
`pnpm exec tsx scripts/pr/check-pr-body.ts <draft.md>`.

Apply the `kaizen` label with `mcp__github__issue_write`, `method: update`,
`labels: ["kaizen"]`. It is the visible signature of the loop. If the call
fails, tell the operator and do not merge.

**Merge it yourself when it is tooling only.** Once CI is green, merge without
asking when `pnpm exec tsx scripts/pr/deploy-fanout.ts origin/main HEAD`
prints no application and the sweep leaves the operator no decision, in its
body or in an entry. A kaizen that changes an app's code waits for his merge.

## Hard rules

- **No "captured as follow-up; not implemented yet"** in any Eradication.
  Implement it, or pick a lower rung you can implement now. An entry in
  analysis mode waiting on the operator's closed question is not a follow-up.
- **Upstream patches stop at `patches/<lib>/<short-name>.{patch,md}`.** The
  operator decides whether to send them.
