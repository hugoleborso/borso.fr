# ADR-0029: Weak point management reads the dantotsu record, made checkable

- **Status:** proposed
- **Date:** 2026-10-10
- **Deciders:** Hugo Borsoni
- **Tags:** weak-point-management, tooling, dantotsu, quality

## Context

Weak point management, as the Theodo Academy standard and the operator's
Notion ADR 0018 *Weak point management outillé* describe it, asks for four
things: place every defect on a map of the system, let the categories grow
as defects arrive, engage on two or three weak points, and count each one
every week until it reaches zero. Notion ADR 0018 chose "the repository as
the platform": a `docs/quality/defects.jsonl` file written by the workflow,
a commit hook and a Sentry webhook, a weekly cron that rebuilds a report,
and a page on Pages showing a product treemap and a factory grid with dated
dots.

This repository already has a defect record: 168 dantotsus, each with front
matter. What it lacked is everything the method reads. No entry names where
the defect lived, no weak point is engaged, nothing counts, and nothing
checks the front matter at all. An audit of the corpus on 2026-10-10 found
53 entries with no fix commit that resolves on `main`, 26 with a placeholder
such as `<TBD>`, 16 with a `detected-at` outside the template's list, 23
claiming eradication level 1, 2 or 4 while shipping only an instruction
edit, and one, `feature-flow-skills-do-not-auto-trigger`, whose eradication
was never committed. A prototype that derived each entry's zone from the
files its fix commits touched resolved 115 of 168, and put most of those on
the files where the eradication landed rather than where the defect lived.

Two constraints close doors. CLAUDE.md forbids follow-up issues, so nothing
here lives in an issue tracker. And no workflow in this repository writes a
line when a gate goes red: the A and B stages of Notion ADR 0018 (caught by
a gate on the first cycle or after) have no writer, and adding one is a
change to every gate.

## Decision

**The dantotsu front matter is the defect record, a schema check makes it
trustworthy, and two generators read it.** Each entry gains `zone:` (the
repository path where the defect lived, checked to exist),
`eradication-paths:` (the files the eradication shipped in, required to name
a non-markdown file at levels 1 to 4), an optional `weak-point:` naming a
row of the committed `docs/quality/weak-points.md`, and `recurs:` linking an
entry to the one it repeats. `scripts/quality/check-dantotsu-front-matter.ts`
enforces the fixed value lists, fix commits that resolve on `main` (or
`[self]` for the commit that adds the entry, or `none (<reason>)`), no
placeholder, the level rule, and, for entries dated from 2026-10-10, a
`recurs:` whenever an entry shares two tags with an earlier one. It runs in
pre-commit and in CI. `scripts/quality/weak-points.ts` draws the two maps
with one dot per defect, counts each engaged weak point per ISO week from
the entries' dates, and lists the recurrence groups; it is in the
`standards` group of `scripts/reports.sh`, its output is gitignored under
ADR-0014, and `pages.yml` publishes it. `scripts/quality/working-conditions.ts`
files archived friction lines under declared walls and is the agent
counterpart of the same method, filed by the Academy's Build, Observe and
Ship.

All 168 entries were backfilled to pass: values mapped onto the lists, fix
commits resolved from the history of `main`, placeholders replaced, the 23
prose-only eradications re-levelled to 5, and every zone chosen by reading
the entry rather than derived from its fix commits.

## Consequences

- `+` The map and the weekly count need no new data source and no manual
  collection: they are recomputed from files that already exist on every
  run, so the count cannot fall behind the record.
- `+` A dantotsu can no longer claim a level its code does not carry, cite a
  commit nobody can find, or retell a recurrence as a new story; the gate
  that refuses this runs where the entry is written.
- `+` The working-conditions board turns friction that was read once, by the
  sweep of one pull request, into a ranking across every archived task.
- `-` Only defects that earned a dantotsu are counted. A gate that went red
  and was fixed in the same session, a correction the operator gave in chat,
  and a production error with no entry are invisible, which is exactly the A,
  B and E stages of Notion ADR 0018. The count is therefore a lower bound.
- `-` `zone:` is written by hand and can be wrong; the check proves it names
  a path, not that the path is where the defect lived. A reviewer is the
  only check on that.
- `-` CI's build job now clones the whole history so the fix commits can be
  resolved, which makes the checkout slower than a shallow one.
- `~` The engaged weak points are an input a person accepts. The three in
  `docs/quality/weak-points.md` are a draft proposed from the data and wait
  for the operator to ratify them.

## Alternatives considered

### Option A — the dantotsu front matter, checked, read by generators (chosen)

- **Summary:** as described in *Decision*.
- **Strengths:**
  - Counts with no manual collection: the record already exists and is
    written as part of the self-improvement loop.
  - No platform to run: two TypeScript generators, one schema check, Pages.
  - The backfill makes the existing five months of defects count from day one.
- **Costs:**
  - Counts only what became a dantotsu.
  - A zone chosen by hand for every new entry.
- **Rationale:** it is the only option that produces a correct count today,
  from data that is already being written.

### Option B — a separate append-only `defects.jsonl` written by tools (Notion ADR 0018's choice)

- **Summary:** a line per occurrence, written by the workflow on a red
  verdict, by a post-commit hook on a `fix:` commit, and by a Sentry webhook
  on a production error, with a cron rebuilding the report.
- **Strengths:**
  - Counts every stage, including the gates' own catches and the operator's
    corrections, so the count is not a lower bound.
- **Costs:**
  - Every writer is new code in a place that writes nothing today, and the
    file would duplicate the dantotsu corpus for the defects that have one.
  - A weekly cron is a recurring job the operator has not asked for, which
    CLAUDE.md forbids.
- **Rejection rationale:** loses on "no new data source" and on the rule
  against recurring jobs. It is the natural next step once a writer exists:
  the generator can read a second source without changing the maps.

### Option C — GitHub issues with zone and stage labels

- **Summary:** one issue per defect, labelled `zone::` and `stage::`, with
  the charts built from the issue list.
- **Strengths:**
  - Nothing to build; the tracker already exists.
- **Costs:**
  - Depends on labelling discipline, and nothing here files issues.
- **Rejection rationale:** CLAUDE.md forbids follow-up issues, so the tracker
  would hold no defect at all.

### Option D — derive each zone from the files the fix commits touched

- **Summary:** the prototype: map each fix commit's changed files to zones,
  so no zone is written by hand.
- **Strengths:**
  - No field to fill, which is criterion 2 of Notion ADR 0018.
- **Costs:**
  - Resolved 115 of 168 entries, and the fix commits point at where the
    eradication landed: a kaizen pull request touches `.husky/`, `scripts/`
    and the skills whatever the defect was.
- **Rejection rationale:** a map of where fixes land is a map of the
  factory's repair shop, not of the weak points. Choosing the zone by hand
  is what makes the dots mean something.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| The count needs no manual collection | high | Notion ADR 0018: a manual count dies within weeks; the ritual survives only if the data arrives by itself. |
| A dot sits where the defect lived | high | Weak point management rests on *where*; a dot at the wrong place sends the engagement to the wrong part of the system. |
| No platform and no recurring job to run | medium | A one-person lab, and CLAUDE.md forbids an unrequested recurring job. |
| Every stage of detection is counted | low | Desirable, but only once something writes the early stages down. |

|             | A | B | C | D |
|---|---|---|---|---|
| No manual collection | ✓ read from the record | ✓ once the writers exist | ✗ an issue per defect | ✓ |
| Dot where the defect lived | ✓ chosen and checked to exist | ✓ zone from CODEOWNERS | ✗ label discipline | ✗ where the fix landed |
| No platform, no recurring job | ✓ | ✗ needs a cron | ✓ | ✓ |
| Every stage counted | ✗ dantotsus only | ✓ | ✗ | ✗ |

## Implementation pointers

- Spec: [`docs/features/meta/weak-point-management/spec/spec.md`](../features/meta/weak-point-management/spec/spec.md)
- Plan: [`docs/features/meta/weak-point-management/plan/plan.md`](../features/meta/weak-point-management/plan/plan.md)
- Commit: stamped by `/after-task-dantotsus` on merge
- Files: `scripts/quality/dantotsu-schema.core.ts`,
  `scripts/quality/check-dantotsu-front-matter.ts`,
  `scripts/quality/weak-points.core.ts`, `scripts/quality/weak-points.ts`,
  `scripts/quality/working-conditions.core.ts`,
  `docs/quality/weak-points.md`, `docs/quality/working-conditions.md`
- Source: Notion ADR 0018 *Weak point management outillé*
  (`https://app.notion.com/p/3aa8f3776f4f81ac8832c0287a62eaad`), narrowed to
  what this repository can build without a new writer.
- Related ADRs: ADR-0014 (generated files are not committed; the pages
  follow it).
