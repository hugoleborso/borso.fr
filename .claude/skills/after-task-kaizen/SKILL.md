---
name: after-task-kaizen
description: Use after a PR has merged or closed to sweep what happened during the task and produce one Dantotsu (under `docs/dantotsus/`) per real defect AND one Knowledge entry (under `docs/knowledge/`) per vendor surprise or reusable insight, then open a follow-up PR labelled `kaizen`. Implements CLAUDE.md's Self-improvement loop rule end-to-end. Triggered by the user saying any of "/after-task-kaizen", "post-merge dantotsus", "kaizen pass on PR #N", "let's capture the lessons from that PR", or by the kaizen task the merged PR's session spawned, which starts this skill in a new conversation. Hard rule — every Dantotsu in the output PR ships a code-level eradication (structural impossibility / DevX check / vendor patch / detection); knowledge-only is the last-resort floor and pure-knowledge subjects go to `docs/knowledge/` instead. Hard rule — agent never opens PRs against repos outside `hugoleborso/*`.
---

# After-task kaizen sweep → `kaizen` PR

The closing move of every PR. CLAUDE.md's **Self-improvement loop**
rule says: when a PR merges or closes, capture the lessons and open
a follow-up PR labelled `kaizen`. This skill is the procedure.

## When to invoke

**Where it runs depends on the shipping session's context.** After the merge,
that session reads its own `get_session` `context_usage.used_tokens`.

- **Under 150,000 tokens**, it runs this sweep itself, in the same reply that
  reports the merge. The operator chose this threshold after PR #371.
- **At 150,000 or more**, it archives its friction log, proposes the kaizen,
  and once the operator approves starts it with whatever tool it holds for
  opening a new session. The prompt names the merged PR, the archived
  `kaizen.md` and this skill (`/open-pr`'s *After the merge*).

Write the reading in the inventory's header line, so the sweep shows which
branch it took. The sweep also starts from:

- A kaizen task started from that card.
- The user says any of: "/after-task-kaizen", "kaizen pass",
  "post-merge dantotsus", "capture lessons from PR #N", "what
  should we add from that PR".

When the operator says where to run it, that wins over the threshold. Run it
there and do not ask him to confirm. He asks agents for it about a quarter of
the time, by his own count, and the shipping session of PR #372 still made
him confirm it.

**First call: `mcp__github__pull_request_read method: get`.** If `merged` is
not `true`, say so and stop. The prompt for PR #253's sweep said "merged"
while the pull request was open with CI running, and its archive was not on
`main` yet.

## When NOT to invoke

- During the PR (use `/dantotsu` per defect instead, in real time).

## The procedure

> **Lean orientation: spend a long time on the problem before any solution.**
> The instinct is to read the PR, name two or three "lessons", and rush
> to write the dantotsus. That is solution-oriented thinking and it is
> the failure mode this skill exists to prevent. Step 1 below is the
> heart of the skill — do it exhaustively, in writing, **before**
> classifying anything. If step 1 produces fewer than ~10 rows for any
> non-trivial PR, you are skimming. Restart.

### 1. Build the friction inventory — exhaustive, not curated

Catalogue **every** moment of friction during the PR — not just the
ones that look like dantotsu material.

Sources to walk in order, capturing each friction event as one row:

- **The archived friction log (primary input).** `git fetch origin main`,
  then `scripts/kaizen.sh sweep-input <merge-sha>`. It names every archive
  the merge touched and, in each, the entry lines *this* merge added. Read
  that, not the path the prompt names, for the reasons its `sweep-input`
  comment gives. The archive is the merged session's `KAIZEN.md`, copied by
  `scripts/kaizen.sh archive` and appended to by the main session *and
  by every subagent that was told to*, one line per friction event,
  problem-only. The local `KAIZEN.md` of this session is
  not the input: it was created empty at this session's start. Map
  every line to an inventory row. Many will resolve to
  `no-op: already eradicated by <existing entry>` once cross-checked
  against the corpus — that cross-check is the point.

  A missing or empty archive is a finding, not an absence: the task ran
  without logging or never archived. Add an inventory row saying so.

- **Every operator message of the shipping session (always).** The
  friction log holds only what the session chose to write down; the operator
  reads each of their own messages as a correction to learn from. Find the
  shipping session from the `Claude-Session:` trailer of the pull request's
  commits (or the session link at the end of its body), then have one
  subagent list its transcript with the remote-session tool that lists a session's events,
  filtered to user messages (`kinds: ["user"]`, paging back with `before_id`
  until `has_more` is false). Then run
  `pnpm exec tsx scripts/kaizen/operator-messages.ts`. It reads every page
  this session or its subagents listed, inline or spilled.
  It prints the messages the operator typed and their answers to questions,
  then every friction line the listed session logged, those logged after its
  archive included. Give each message and each such line its own
  inventory row,
  classified as a request the first brief could have carried, a correction of
  something shipped, a question the session should have asked first, or
  direction with no lesson. On PR #389 almost every
  operator message was a correction, and the log held only a few of them.
  When no tool can read the transcript, say so in an inventory row and ask the
  operator to paste their messages.

  **Read the writer, not only the line.** Every entry names who logged
  it. One agent hitting a wall is a local problem; four agents hitting
  the same wall is a systemic one, and the two deserve different
  eradications — the first a fix where it happened, the second a change
  to whatever they all read. Group the lines by writer once before
  classifying, and put the count in the inventory row: *"three of the
  five auditors logged this"* is the evidence that promotes a knowledge
  entry into a gate. Entries written as `main` from a task that spawned
  agents mean the agents were never told their label; note it, because
  the sweep is then blind to whatever they hit.
- **The shipping session's own turns**, when the sweep runs there. Walk them
  one by one, hook refusals and harness notices included, before reading the
  archive. The first sweep of PR #385 started from its three archive lines,
  listed 12 rows and missed 17, and the operator sent it back.
- **Open kaizen pull requests.** `mcp__github__list_pull_requests` with
  `state: open`, then read each `kaizen`-labelled one's `inventory.md`. A row
  another open sweep already eradicates is `merge into PR #<n>`, not a second
  fix. The sweeps of PR #251 and PR #252 ran at once, both eradicated the
  same Prettier run, and the later one dropped its work after a merge
  conflict.
- **The pull request's conversation and review threads.** This
  session never saw the merged session's chat, so the PR is the record
  of it. Read the threads with `mcp__github__pull_request_read`. Every
  interrupt-and-redirect from the user (*"wait, you missed X"*, *"NO, do Y"*, *"why did you
  assume Z"*, *"that doesn't work, try …"*, *"there was a lot more
  friction than what you said"*) is a row. Every silent
  course-correction the user made is a row.
- **Commit history**, especially:
  - `Revert "…"` commits (an approach tried, rejected, replaced).
  - `--amend`-noisy stretches (commitlint failures, missed scope, …).
  - Refactor commits that immediately follow feat/fix commits
    (signals: "I shipped it then realised I should have done it
    differently").
- **CI failures** during the PR (`get_check_runs`). Every red run
  that went green later is a row.
- **Validation reports** committed to the PR
  (`docs/features/<app>/<slug>/validation/`). Every FAIL or
  UNVERIFIABLE row in any report is a friction event.
- **Tooling warnings** that fired during the session: knip noise,
  ESLint diagnostics, Husky hook rejections, AWS API errors,
  build pipeline surprises, dev-server crashes.
- **Vendor "I didn't know it did that" moments** — every time
  documentation contradicted observation.
- **Skill / harness misfires** — skills that didn't auto-trigger
  when they should have, tools called with the wrong shape, paths
  assumed instead of verified.

Output: a markdown table with these columns, committed to
`docs/features/meta/lessons-from-pr-<N>/inventory.md`, which the kaizen
PR body links from its *Inventory* section. The table does not go in the
body, whose budget in `scripts/pr/check-pr-body.ts` it cannot fit.

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | spec | … | <commit / report / chat snippet> | <what makes this friction possible at all> | <the problem in another place this friction is a symptom of, or `none` with why the cause is local> | dantotsu / knowledge / no-op (with one-line reason) |

Ask of every row: is this friction a symptom of a problem elsewhere? Where a
friction is felt is rarely where it is made. A validator that missed a bug may
reveal a spec that never named the case. An agent that guessed a path may
reveal a skill that never says where the file lives. A test that broke on a
rename may reveal two modules that know each other's internals. Name that
other problem in the `Elsewhere` cell, with the file, skill, step or design
choice it lives in. `none` says why the cause is local to where it was felt.
When the cell names a problem, the decision targets that problem, not the
friction that revealed it.

Remove the cause, do not work around the friction. The `Cause` cell names
what makes the friction possible at all: a file every pull request appends to,
a step done by hand, two places that hold one rule. A `fixed:` or `dantotsu:`
decision removes that cause. A message or a script that works around the
friction leaves the cause in place and adds one more thing to maintain, so it
is not an eradication. A guard that verifies a property still ships beside the
removal, and a guard that measures the wrong thing gets fixed. A guard may
verify, but it never replaces the removal. If no removal is possible here, say
so in the cell and ask the operator. The sweep of PR #351 first shipped a stop
script, a refusal message and a corrected guard, without naming the causes,
and the operator sent it back. He kept the guard, because it verifies.

Conventions:

- `When`: stage where the friction occurred — `conception` /
  `spec` / `plan` / `implementation` / `validation` /
  `pr-description` / `deploy` / `post-merge`.
- `Friction`: one sentence, user-perspective. *"I assumed X without
  asking; user pulled me back"*, *"deploy failed with CNAME
  conflict"*, *"validation rule missing led to false PASS"*.
- `Sources / evidence`: at least one of `commit:<sha>`,
  `report:<path>`, `comment:<github-link>`, `transcript:<paraphrase>`,
  `ci:<run-url>`. Concrete. A row without evidence is a row that
  can't be audited.
- `Decision`: one of:
  - `dantotsu: <slug>` — defect or design pivot with code-level
    eradication available. Spawn a `docs/dantotsus/<slug>.md`
    entry.
  - `knowledge: <slug>` — vendor surprise or operator confusion.
    Spawn a `docs/knowledge/<slug>.md` entry.
  - `merge into <slug>` — covered by another row's entry.
  - `fixed: <commit>` — a small change with no entry of its own,
    shipped in the kaizen PR.
  - `no-op: <one-line reason>` — friction was real but already
    eradicated by an upstream rule, or genuinely too small. **The
    reason is required.** "Already covered by the `*.utils.ts`
    rule landed earlier in the same PR" is fine; "skipped" is not.
    **A reason that names a change is not a no-op.** "Worth a line in
    the hook's message" is a fix someone has to make, so make it in
    this PR and record the row as `fixed: <commit>`. PR #108's sweep
    wrote exactly that about the kill hook's `ss` advice, shipped
    nothing, and PR #136 hit the same missing `ss` again.

**Hard floor: every row has a decision. No `?` cells. No "we'll
think about this later".**

### 1b. Measure what the pull request cost

Write `docs/features/meta/lessons-from-pr-<N>/cost.md`, one row under the
header of `docs/quality/feature-cost.md`, by the sources its *Targets* table
names: `get_session` on every session in the commits' `Claude-Session`
trailers, and the feature's validation reports. The row goes in the sweep's
own folder because a shared table made every pair of parallel sweeps collide.

### 1c. Stamp the ADRs the merge shipped

`git diff --name-only <merge>^ <merge> -- docs/adr/` lists the ADRs the pull
request added. Set each one still marked `- **Status:** proposed` to
`accepted` in the file, as `/adr`'s lifecycle says. No other step does it: twenty-five ADRs
merged from `0010` to `0046` were still `proposed` when the sweep of PR #234
looked.

### 2. Re-read the table top-to-bottom — only now classify

After the table is committed to writing, scan it as a whole.
Patterns emerge that single-row inspection misses:

- *Three rows of the form "I assumed X without asking"* → the
  spec skill needs a stricter perspective-confrontation rule, not
  three separate dantotsus.
- *Two rows of "the validator missed Y because Y wasn't named in
  the spec"* → spec template needs a new sub-section, one
  dantotsu covers both.
- *Five rows of "tool W errored on input Z"* → one knowledge
  entry for the tool quirk, not five.

Drop subjects that overlap (use `merge into <slug>` rows). Be
ruthless: ten thin entries help nobody; three sharp ones do — but
the inventory has to come first, so the ruthless cut is *informed*.

### 2b. Classification cheatsheet

For each surviving subject (i.e. not a `merge into` row):

| Class | Test | Output |
| --- | --- | --- |
| **Real defect** (we shipped or almost shipped a bug, or our code did the wrong thing) | The fix went into the codebase / workflows. | **Dantotsu** under `docs/dantotsus/`. Run [`/dantotsu`](../dantotsu/SKILL.md) per subject. Eradication is mandatory. |
| **Design pivot** (we tried approach A, abandoned it for B) | The PR has reverts or the user explicitly said "let's not do that". | **Dantotsu** about the conception-stage misconception that made A look right. Eradication: structural change so the abandoned approach is no longer expressible. |
| **Vendor surprise** (AWS, GitHub, pnpm, etc. behaved unlike its docs) | The behaviour is a fact of life of the underlying tool; nothing in our code is broken. | **Knowledge entry** under `docs/knowledge/`. No causal-chain ceremony required. |
| **Operator confusion** (a one-liner failed because of shell / CLI quirks) | The "fix" was a doc / convention, no code change. | **Knowledge entry** under `docs/knowledge/`. |
| **Reusable insight** (something the team should know but isn't really a defect) | We learned how something works; future contributors would benefit. | **Knowledge entry**. Knowledge is broad — anything genuinely useful. |
| **No-op** | Friction was real but already eradicated by an upstream rule, or genuinely too small. | One-line reason inline in the table. Never a silent skip. |

### 3. Write the entries

For each surviving subject:

**Real defects / design pivots → `docs/dantotsus/<slug>.md`:**

1. Write it with [`/dantotsu`](../dantotsu/SKILL.md), whose *Eradication* and
   *Front matter* sections hold the ladder, the proof on a scratch copy and the
   fields. Take a tag from `grep -h '^tags:' docs/dantotsus/*.md | sort -u`
   when one fits.
2. **Ship the eradication**, code in this PR. Write the level's name beside
   its number wherever a person reads it. Feed a guard hook its proof with
   `KAIZEN_LOG_REFUSALS=0`, or the proof lands in `KAIZEN.md` as friction.
   Never add a check that only guards the harness.
   **A mechanism that changes how the operator works is his call.** That
   is one that changes when he is asked for something, when CI or a
   preview runs, or what a session waits for. Write its entry in
   [`/dantotsu`](../dantotsu/SKILL.md)'s analysis mode, ask him one
   closed question, and build only the option he picks. The sweep of
   PR #310 built four such mechanisms unasked and removed all four once
   he read them.
   **No option hands the operator a task per pull request.** A manual
   check, a checklist or a device walk-through for each change is not an
   option to offer. Find the detection that needs nobody, such as a check
   the app runs on itself and reports to Sentry, and ship that. The sweep
   of PRs #331 to #337 offered a per-PR iPhone checklist, and the operator
   refused it for that detection.

**Vendor surprises / operator confusion / reusable insights →
`docs/knowledge/<slug>.md`:**

1. Extend an entry on the same tool or symptom
   (`grep -ril <tool> docs/knowledge/`) before writing a second one.
2. Follow [`docs/knowledge/README.md`](../../../docs/knowledge/README.md). Take
   the `triggers:` from the inventory row, at the moment the subject bit.

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
`docs: lessons from PR #<N>`.

**The sweep removes at least as much as it adds.** After the last commit, run
`scripts/kaizen.sh balance` and paste its line under the body's description.
It counts code, and its `not_counted` list names what it leaves out. When it
refuses, remove what each addition replaces: fold an entry into one that
exists, delete the check or text the new mechanism makes redundant. CI runs
the same command as `kaizen-balance`, and `pre-push` refuses a
`lessons-from` branch on it. A removal is the only answer to its refusal.

Once the friction log is archived, `pnpm exec tsx
scripts/quality/working-conditions.ts --check` must pass. Three unfiled lines
about one wall are a wall to add to `docs/quality/working-conditions.md`.

**PR body shape.** Draft from [`template.md`](./template.md) and check it with
`pnpm exec tsx scripts/pr/check-pr-body.ts <draft.md>`, which holds the limits.
Three sections, bounded, because the body is a skim and not the record:

1. `## Inventory` — the decision counts, and a link to the full table.
2. `## Shipped` — one row per entry: what it is, its level, what is now
   impossible.
3. `## Patterns` — what the inventory shows that no single row does.

**Apply the `kaizen` label.** This is non-optional — the label is
the visible signature of the self-improvement loop in the repo.

Apply it with `mcp__github__issue_write`, `method: update`, `labels: ["kaizen"]`.
If the call fails, tell the operator and do not merge.

**Merge it yourself when it is tooling only.** Once CI is green, merge the
kaizen pull request without asking when `pnpm exec tsx scripts/pr/deploy-fanout.ts
origin/main HEAD` prints no application and the sweep leaves the operator no
decision, in its body or in an entry. The operator granted this on 2026-11-14. A kaizen that changes an app's
code, which a root cause often calls for, waits for his merge like any other.

### 6. Even if there are zero lessons

Still open the PR with a CLAUDE.md-aligned commit:
`docs: no setup changes from PR #<N>`. Body: one paragraph noting
what the PR shipped and confirming no defect / surprise / pivot /
operator-confusion came up worth capturing. The loop's *existence*,
not its volume, is what keeps the system improving.

## Hard rules

- **No "captured as follow-up; not implemented yet"** in any
  Eradication section. Either implement it or pick a lower level
  that you can implement now. An entry in analysis mode that waits
  on the operator's closed question is not a follow-up.
- **No issue creation as a substitute for a code commit.** Issues
  drift; the loop dies.
- **Agent never opens PRs against repos outside `hugoleborso/*`.**
  For upstream patches, produce
  `patches/<lib>/<short-name>.{patch,md}` and stop. The human
  decides whether to send it upstream.
- **Every Dantotsu links its eradication commit + diff snippet.**
  No vague pointers; the reader can verify the fix landed.
