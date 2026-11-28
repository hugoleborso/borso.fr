---
name: after-task-kaizen
description: Use after a PR has merged to sweep what happened during the task, write one Dantotsu (`docs/dantotsus/`) per real defect and one Knowledge entry (`docs/knowledge/`) per vendor surprise or reusable insight, and open a follow-up PR labelled `kaizen`. Triggered by "/after-task-kaizen", "kaizen pass on PR #N", "post-merge dantotsus", "capture the lessons from that PR", or by the kaizen task a merged PR's session started.
---

# After-task kaizen sweep → `kaizen` PR

The procedure behind CLAUDE.md's **Self-improvement loop**. During a PR, use
`/dantotsu` per defect instead.

## When to invoke

**First, decide whether a sweep is worth running.** It is when the task left
something to learn: a line in the branch's friction log, an operator message
that corrected or redirected the session, a CI run that went red, or a FAIL or
UNVERIFIABLE row in a validation report. When none of these happened, run no
sweep and open no pull request. The merge reply says "No kaizen" with that
evidence. The operator asked for this after a sweep was offered for a PR with
none of them.

**Where it runs depends on the shipping session's context.** After the merge,
that session reads its own `get_session` `context_usage.used_tokens`.

- **Under 150,000 tokens**, it runs this sweep itself, in the same reply that
  reports the merge. The operator chose this threshold.
- **At 150,000 or more**, it proposes the kaizen, and once the operator approves starts it in a new session, as `/open-pr`'s
  *After the merge* says.

Write the reading in the inventory's header line, so the sweep shows which
branch it took. When the operator says where to run it, that wins over the
threshold. Run it there without asking him to confirm.

**First call: `mcp__github__pull_request_read method: get`.** If `merged` is
not `true`, say so and stop. A prompt once said "merged" while the pull
request was still open and its friction log was not on `main`.

## The procedure

Spend a long time on the problem before any solution. The instinct is to read
the PR, name two or three lessons and write the dantotsus. That is
solution-oriented thinking, the failure this skill exists to prevent. Step 1 is
the heart of the skill. Do it exhaustively, in writing, **before** classifying anything.
Fewer than about ten rows for a non-trivial PR means you are skimming, so
restart.

### 1. Build the friction inventory, exhaustive, not curated

Catalogue **every** moment of friction, one row each, from these sources:

- **The friction log (primary input).** `git fetch origin main`, then
  `git diff <merge-sha>^ <merge-sha> -- docs/kaizen`. Each branch logs to its
  own `docs/kaizen/<branch>.md`, so the lines that diff adds are this pull
  request's and no other's, worktree agents' files included. Map every line to a row. Many lines resolve to
  `no-op: already eradicated by <existing entry>` once cross-checked against
  the corpus, and that cross-check is the point. A missing or empty log is
  itself a row. Then rebuild the inventory from the commits, the review threads
  and any run journal under `docs/features/<app>/<slug>/runs/`.
- **Every operator message of the shipping session.** The log holds only what
  the session chose to write down. Find the session from the `Claude-Session:`
  trailer of the PR's commits, or the session link at the end of its body,
  then have one subagent list its transcript with the remote-session tool that
  lists a session's events, `kinds: ["user"]`, paging back with `before_id`
  until `has_more` is false. Then run
  `pnpm exec tsx scripts/kaizen/operator-messages.ts`. It reads the pages this
  session and its subagents listed, from their transcripts, and prints the
  typed messages, the answers to questions, and every friction line the session
  logged, late ones included. Give each its own row, classified as a request
  the first brief could have carried, a correction of something shipped, a
  question the session should have asked first, or direction with no lesson.
  When no tool can read the transcript, say so in a row and ask the operator
  to paste their messages.

  **Start from the place, not the sentence.** A line is what its writer saw,
  then `(where: ...)`, the command, URL, screen or file and line where they saw
  it. `scripts/kaizen.sh` refuses a line without a place, and asks for what was
  seen rather than why. The writer logs at the moment they already hold a guess
  about the cause, and a guess written into the line steers the sweep toward
  the eradication it implies. So go to the place, look again, and ask why from
  what you find there. Treat any cause a line still states, older lines
  included, as a hypothesis to test, never as the row's cause.

  **Read the writer, not only the line.** One agent hitting a wall is local.
  Several agents hitting the same wall is systemic and calls for a change to
  whatever they all read. Group the lines by writer and put the count in the
  row, because "three of five auditors logged this" is what promotes a
  knowledge entry into a gate. Entries logged as `main` from a task that
  spawned agents mean the agents were never told their label, which blinds
  the sweep to what they hit. Note it.
- **The shipping session's own turns**, when the sweep runs there. Walk them
  one by one, hook refusals and harness notices included, before reading the
  log. A sweep that started from its three logged lines listed 12 rows
  and missed 17.
- **Open kaizen pull requests.** Read each open `kaizen`-labelled PR's
  `inventory.md`. A row another open sweep already eradicates is
  `merge into PR #<n>`, not a second fix.
- **The PR's conversation and review threads.** Every comment that corrects
  or redirects the session is a row. So is every silent course-correction the
  operator made.
- **Commit history.** Reverts, `--amend`-noisy stretches, and refactors right
  after a feat or fix.
- **CI runs** that went red, then green.
- **Validation reports** under `docs/features/<app>/<slug>/validation/`. Every
  FAIL or UNVERIFIABLE row.
- **Tooling, vendor and harness surprises.** Hook rejections, lint noise, AWS
  errors, build and dev-server crashes, documentation contradicted by
  observation, a skill that did not trigger, a tool called with the wrong
  shape, a path assumed instead of verified.

Commit the table to `docs/features/meta/lessons-from-pr-<N>/inventory.md`.
The PR body links it from *Inventory*, because the table cannot fit the body's
budget.

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | spec | … | <commit / report / chat snippet> | <what makes this friction possible at all> | <the problem in another place this friction is a symptom of, or `none` with why the cause is local> | dantotsu / knowledge / no-op (with one-line reason) |

**Elsewhere.** Where a friction is felt is rarely where it is made. A
validator that missed a bug may reveal a spec that never named the case. An
agent that guessed a path may reveal a skill that never says where the file
lives. A test that broke on a rename may reveal two modules that know each
other's internals. Name
that other problem with the file, skill, step or design choice it lives in.
When the cell names one, the decision targets it, not the friction.

**Cause.** Remove the cause, not the friction. The cell names what makes the
friction possible at all, such as a file every PR appends to, a step done by
hand, or two places that hold one rule. A `fixed:` or `dantotsu:` decision
removes it. A message or script that works around the friction leaves the
cause and adds one more thing to maintain, so it is not an eradication. A
guard that verifies a property may ship beside the removal, never instead of
it, and a guard that measures the wrong thing gets fixed. If no removal is possible,
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
    right and whose eradication makes A no longer expressible.
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
one change to the spec skill, not three dantotsus. Two rows where the
validator missed a case the spec never named are one dantotsu on the spec
template. Five rows of one tool erroring are one knowledge entry. Fold
overlaps with `merge into <slug>`. Three sharp entries beat ten thin ones.

### 3. Write the entries

**Real defects and design pivots.** Write each with
[`/dantotsu`](../dantotsu/SKILL.md) in fix mode, and ship its eradication as
code in this PR. Take a tag from `grep -h '^tags:' docs/dantotsus/*.md | sort -u`
when one fits. Write the level's name beside its number in the entry's
*Eradication* block, as in the PR's *Shipped* table. Feed a guard hook its
proof with `KAIZEN_LOG_REFUSALS=0`, or the proof lands in the friction log as
friction. Never add a check that only guards the harness.

- **Look for a library before writing a check.** When a draft eradication is
  a lint rule, a hook, a CI script or a helper of our own, first ask whether a
  maintained library would delete the code that hosts the bug. That is level
  1, structural impossibility, instead of level 2. Name the role of the code,
  not the bug, such as "subscribe to an external store and dedupe", and look
  in `node_modules/.modules.yaml`, then on npm. Weigh bundle weight, peer
  dependencies, maintenance and fit. If you adopt, the migration is the
  eradication. If you build, the *Eradication* block names the library you
  rejected and why, or the next sweep finds it again. Three rows on one
  architectural layer (data fetching, routing, form validation, i18n) are one
  row, "we built our own where a library exists", with the migration as its
  eradication. This rule is the kaizen-time eradication of
  [`built-my-own-before-checking-the-library`](../../../docs/dantotsus/built-my-own-before-checking-the-library.md).
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
Prefer the narrowest trigger that would have fired at that moment.

Link each new entry to the existing ones its chain touches.

### 4. Open the follow-up PR with the `kaizen` label

Branch `claude/lessons-from-pr-<N>`, title `docs: lessons from PR #<N>`,
`docs:` commits plus whatever code the eradications need.

**The sweep earns its code by deleting or simplifying code.** After the last
commit, run `scripts/kaizen.sh balance` and paste its line under the body's
description. It counts code only, so a skill, a doc or an entry is never cut to
pass it. When it refuses, delete the code each addition replaces, or simplify
code elsewhere. CI (`kaizen-balance`) and `pre-push` run the same command. Only
the operator waives it, and his words go in the sweep's `balance-waiver.md`.

`pnpm exec tsx scripts/quality/working-conditions.ts --check` must pass. Three unfiled lines
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
