---
name: dantotsu
description: Use when the user asks for a Dantotsu, root-cause analysis (RCA), five whys or post-mortem of a defect, or types `/dantotsu`. Writes one entry under `docs/dantotsus/` on the Future of Software guild's template (user impact, causal chain, root cause of occurrence, detection failure causes, countermeasure, eradication), with each section's checkpoints. Stops at a proposal when the operator asked for analysis; ships a code-level eradication when the fix is chosen.
---

> **Paths.** `${CLAUDE_PLUGIN_ROOT}` is the borso-harness folder. Claude Code fills it in when the harness loads as a plugin, and the harness's session hook exports it to the shell when a repository links the harness into `.claude/` instead. If it is still unexpanded, the folder is the output of `cd -P .claude/skills/route/../.. && pwd`. Repository paths in this file are borso.fr's layout, which is the default. `${CLAUDE_PLUGIN_ROOT}/scripts/harness-path.sh` prints where the current repository keeps each one (`standards`, `dantotsus`, `knowledge`, `adr`, `features`, `reports`, `prBodyCheck`, `blueprintIndex`, `phone`); read every default through that answer, and when the mapped file is missing, report that step as unverifiable rather than substitute something else. A record of borso.fr's own, such as a dantotsu or ADR cited by name, that this repository does not have is at https://github.com/hugoleborso/borso.fr/tree/main/docs. The harness's agents are dispatched by their bare names, such as `technical-validator`; a session that installed the harness as a plugin lists them as `borso-harness:technical-validator`.

# Dantotsu: one defect, understood to its misconception

A dantotsu investigates one defect until the developer understands the
belief that made the faulty code feel right, then makes that class of
defect unable to return. The spirit, the typical mistakes and the reframes
are in [`standard.md`](./standard.md). Read it before writing one.

The entry follows the structure of the Future of Software guild's template:
six sections, in this order, each answered from the user's side first.

## Two modes

- **Analysis.** The operator asked to understand a defect, or asked for a
  dantotsu before choosing a fix. Write the entry with the countermeasure
  and eradication as proposals, each option with its cost, then stop and
  ask which one to ship. Change no product code. The front matter then
  carries `eradication-level: 5`, `eradication-paths: []` and
  `fix-commits: none (proposal under review)`, and the entry opens with a
  one-line status saying it is a proposal.
- **Fix.** The operator chose the fix, or `/after-task-kaizen` called this
  skill after a merge. Ship the countermeasure and the eradication, and
  record them in the entry.

When the request does not say which, it is analysis.

## Before writing

1. List the existing entries and find any this defect repeats:
   `${CLAUDE_PLUGIN_ROOT}/skills/dantotsu/scripts/list.sh` (add `--json`
   for ndjson). Read every entry sharing two or more tags.
2. Reproduce the defect, or gather its artefacts (logs, rows, traces,
   screenshots). Label every claim measured, inferred or guess, in the
   same sentence.
3. If the feature is no longer used, propose deleting the code instead.

## The entry

Copy [`docs/dantotsus/_template.md`](../../../../docs/dantotsus/_template.md)
to `docs/dantotsus/<slug>.md`. Its `##` headings are the only sections:
`check-dantotsu-front-matter.ts` refuses an added or missing one in an entry
dated 2026-11-01 or later. Evidence that fits no section goes in the one it
qualifies. Write short sentences with nothing superfluous. The title names the problem,
never the solution, and sparks curiosity. Long evidence (a screenshot, a
log dump) goes in a `<details>` block so the entry stays short.

Each section below ends on its checkpoints. The section is done when every
checkpoint holds.

### User impact

What the user saw against what they should have seen.

- Describes the problem without the solution, in the text and the visuals.
- Shows seen against expected, as a screenshot or a two-column table.
- Gives exact numbers and names who measured them (the original report, the
  reproduction).

### Causal chain

The sequence of events from what the user saw back to the faulty line.

- Nested bullets: each point sits under the one it explains.
- Reads top to bottom with "Why?" between each point and the next.
- One branch per cause when several causes combine.
- Every point is an event that happened, never a missing solution ("we did
  not do X").
- Names the faulty line, with at most 20 lines of code.

### Root cause of occurrence

The technical or business misconception that made the faulty code feel
right, in the form *thought ___, actually ___*.

- Names the actual misconception, not an element of the context.
- States the fact, without "we did not know".
- Is sourced: a link to the documentation or source you read this session,
  with the quoted passage.
- Passes the test: had the developer known the "actually" part, they would
  have written correct code first time.

### Detection failure causes

Why each layer that could have caught the defect did not, in firing order:
typing, linter, local validation, CI, review, QA, monitoring.

- Each cause names the specific reason that layer missed it.
- "There was no test" is pushed one step further, to why no test covered
  the path.

### Countermeasure

The minimal change that restores the behaviour and shows the cause was
understood. In analysis mode, the options side by side with what the user
sees and what each costs.

- Removes the misconception, rather than wrapping the failing path in a
  condition.
- Names how it was verified (the reproduction now passing), or, for a
  proposal, how it will be.

### Eradication

The mechanism that guarantees this class of defect cannot come back. Keep
this heading word: `scripts/standards/provenance.core.ts` reads the section
by `## Eradication`.

- A mechanism, not a to-do list. Pick the highest rung reachable:
  1. **Structural impossibility**: a type or API shape that cannot express
     the misconception.
  2. **DevX check**: a rule under `eslint-rules/`, a hook or a type guard
     that refuses it at lint or commit time.
  3. **Vendor patch**: `patches/<lib>/<short>.patch` applied with
     `pnpm patch`, plus `patches/<lib>/<short>.md` holding the upstream PR
     body for the operator to send. Open pull requests only against
     `hugoleborso/*`.
  4. **Detection**: an alarm, a synth-time test or an integration test on
     the path that had none.
  5. **Triggered knowledge entry**: a `docs/knowledge/` file whose
     `triggers:` name the file, command or output at which the symptom
     shows. Only when rungs 1 to 4 are impossible.
- The mechanism has been tried: plant the defect on a scratch copy, run the
  check, paste its refusal here, revert.
- Subtract first: a mechanism whose removal makes the defect impossible
  beats a new check.
- Similar instances were searched for and listed, with the command that
  found them.
- Says "eradicated" only when no defect of the same class can recur, not
  just this one.
- Links the commit, the PR and a diff snippet once shipped.

## Front matter

`scripts/quality/check-dantotsu-front-matter.ts` refuses a wrong one in
pre-commit, pre-push and CI.

- `introduced-at`, `detected-at`, `severity` and `eradication-level` take
  only the values the template lists.
- A pull request is `'#<n>'` or `none (<reason>)`.
- `fix-commits` is `[self]` when the eradication ships in the same commit as
  the entry (a squash merge renames branch commits), or `none (<reason>)`,
  and then the level is 5.
- `eradication-paths` lists the files the eradication lives in. Levels 1 to
  4 need one that is not markdown. An edit to a skill, an agent, CLAUDE.md
  or a standard is level 5.
- `zone` is the path where the defect lived, not where the fix landed. It
  must exist.
- `weak-point` names a row of
  [`docs/quality/weak-points.md`](../../../../docs/quality/weak-points.md)
  when the defect belongs to one.
- `recurs` names the entry this repeats, or `none (<why it is a different
  class>)` when it shares two or more tags without repeating.
- No placeholder anywhere.

## Where else things go

- A vendor quirk or a convention with no causal chain goes to
  `docs/knowledge/`, not here.
- After a merge, [`/after-task-kaizen`](../after-task-kaizen/SKILL.md) calls
  this skill once per real defect, in fix mode.
