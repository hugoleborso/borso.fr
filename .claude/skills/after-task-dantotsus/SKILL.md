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

> **Lean orientation: spend a long time on the problem before any solution.**
> The instinct is to read the PR, name two or three "lessons", and rush
> to write the dantotsus. That is solution-oriented thinking and it is
> the failure mode this skill exists to prevent. Step 1 below is the
> heart of the skill — do it exhaustively, in writing, in the PR
> description, **before** classifying anything. If step 1 produces fewer
> than ~10 rows for any non-trivial PR, you are skimming. Restart.

### 1. Build the friction inventory — exhaustive, not curated

Catalogue **every** moment of friction during the PR — not just the
ones that look like dantotsu material. The table is the **first
section of the kaizen PR description** so a reader sees the full
reality before any conclusions.

Sources to walk in order, capturing each friction event as one row:

- **Conversation transcript.** Every interrupt-and-redirect from
  the user (*"wait, you missed X"*, *"NO, do Y"*, *"why did you
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
  Biome plugin diagnostics, Husky hook rejections, AWS API errors,
  build pipeline surprises, dev-server crashes.
- **Vendor "I didn't know it did that" moments** — every time
  documentation contradicted observation.
- **Skill / harness misfires** — skills that didn't auto-trigger
  when they should have, tools called with the wrong shape, paths
  assumed instead of verified.

Output: a markdown table with these columns, **at the very top of
the kaizen PR description**, before any other section:

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | spec | … | <commit / report / chat snippet> | dantotsu / knowledge / no-op (with one-line reason) |

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
  - `no-op: <one-line reason>` — friction was real but already
    eradicated by an upstream rule, or genuinely too small. **The
    reason is required.** "Already covered by the `*.utils.ts`
    rule landed earlier in the same PR" is fine; "skipped" is not.

**Hard floor: every row has a decision. No `?` cells. No "we'll
think about this later".**

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

### 2c. Library-search pass — before writing custom anything

For every subject classified as **real defect** or **design pivot**
whose draft eradication is *"add a Biome plugin"*, *"add a hook"*,
*"add a CI script"*, *"build a wrapper / a helper / a custom utility"*,
or any other "we'll write X" — pause and run a library-search pass
**before** opening the dantotsu file.

The question to ask: *is there a battle-tested library that, if
adopted, would make the bug class impossible by deleting our code
that hosts the bug?* That's a **level-1** eradication (structural
impossibility) instead of the **level-2** lint rule you were about
to draft.

The pass is mechanical:

1. Name the *role* of the custom code you'd write. Not the bug — the
   role. *"Subscribe to an external store and dedupe"* → data-fetching
   library. *"Type a fetch surface with route inference"* → RPC
   client. *"Parse XML to GeoJSON"* → geo library. *"Manage form state
   with validation"* → form library.
2. Search:
   - `git grep -l '<topic>' node_modules/.modules.yaml` — is something
     already installed that we forgot about?
   - npm / web search for the role + the stack we're on (e.g. *"react
     data fetching library 2026"*).
   - Skim the top 2-3 hits' README for *"does this do X?"*.
3. Evaluate against the context:
   - Bundle weight (front-side only).
   - Peer-dep constraints (React version, Node version).
   - Maintenance signal (last release, open-issue trend).
   - Surface fit — does the library map onto our domain or fight it?
4. Decide:
   - **Adopt** → the eradication is the migration, not the plugin.
     Promote level from 2 to 1. The plugin can still ship as
     defence-in-depth, but the *cause* of the bug class has to be
     deleted.
   - **Build custom** → document the trade-off in the dantotsu's
     *Eradication* block: what library was considered, why it didn't
     fit, what the cost-benefit decision was. Without that note, the
     next kaizen re-discovers the same library.

**Rule of thumb:** if **three** rows in the inventory touch the same
*architectural layer* (data fetching, routing, form validation,
i18n, …), the meta-pattern is *"we built our own where a library
exists"*. Add an inventory row that says so, classify it as a
real-defect / design-pivot with level-1 migration as the
eradication, and merge the three original rows into it. **Reuse
before reinvent** is the lean rule ; you can build custom *after*
you've named the libraries you rejected and why.

> *Mirrors [`docs/dantotsus/built-my-own-before-checking-the-library.md`](../../../docs/dantotsus/built-my-own-before-checking-the-library.md)
> applied at kaizen time instead of implementation time. See also
> [`docs/knowledge/audit-imported-deps-and-patterns-when-planning.md`](../../../docs/knowledge/audit-imported-deps-and-patterns-when-planning.md)
> for the planning-stage analogue.*

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
`docs: lessons from PR #<N>`.

**PR body shape (in this order, every section required):**

1. `## Friction inventory` — the table built in step 1, verbatim.
   This is the *first* thing in the PR body; reviewers see the
   problem space before any conclusion.
2. `## Patterns` — a short paragraph naming the patterns the
   inventory revealed (see step 2). Keep it to 3–5 bullets.
3. `## Dantotsus shipped` — bulleted list of the
   `docs/dantotsus/<slug>.md` entries with one-line summaries.
4. `## Knowledge entries shipped` — bulleted list of the
   `docs/knowledge/<slug>.md` entries with one-line summaries.
5. `## Eradication commits` — bulleted list of `feat:` / `fix:` /
   `chore:` commits on this branch that landed code-level
   eradications, each linked.

If the PR has zero entries (everything classified `no-op`), the
inventory still goes first; the patterns / dantotsus / knowledge
sections become "none — see inventory for reasons".

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
