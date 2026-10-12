# Weak point management for the dantotsu record

## Problem

Weak point management places every defect on a map of the system, engages
on two or three places where defects keep landing, and counts each one
every week until it reaches zero. This repository has 168 dantotsus and
none of that. No entry names where its defect lived, nothing counts, and
nothing reads the front matter, so it drifted: an audit on 2026-10-10 found
53 entries with no fix commit that resolves on `main`, 26 with a
placeholder, 16 with a `detected-at` outside the template's list, 23
claiming a level their eradication did not ship, and one eradication that
was never committed.

The operator approved building it in one pull request.
[ADR-0029](../../../../adr/0029-weak-point-management-from-the-dantotsu-record.md)
records the choice of the dantotsu front matter as the defect record.

## What ships

1. A schema check on every dantotsu's front matter, in pre-commit and CI,
   cited in [`12-linting-and-gates.md`](../../../../standards/12-linting-and-gates.md).
2. The 168 entries backfilled so the check passes, with no change to their
   findings beyond what the backfill needs.
3. A `zone:` field on every entry, checked to name a real path, and an
   optional `weak-point:` field.
4. A weak-points generator: a product map and a factory map with one dated
   dot per defect, a weekly count per engaged weak point, and the list of
   recurrences.
5. A committed `docs/quality/weak-points.md` holding the engaged weak
   points, as a draft for the operator to ratify.
6. An agent working-conditions board built from the archived friction logs
   and inventories, filed under Build, Observe and Ship.
7. The dantotsu skill and template, and `/after-task-dantotsus`, updated so
   new entries fill the new fields.
8. ADR-0029.

## Decisions

| Question | Answer |
| --- | --- |
| Where does the defect record live? | In the dantotsu front matter. No second file. |
| How is a zone chosen? | By hand, at the path where the defect lived. Fix commits point at where the eradication landed, so they are not used. |
| What resolves "on main"? | A prefix that names exactly one commit in `git rev-list origin/main`. Pre-commit resolves the staged entries only; CI resolves all of them from a full clone. |
| What about the entry's own fix, which a squash merge renames? | `fix-commits: [self]` names the commit that adds the entry. |
| When is `recurs:` required? | For an entry dated 2026-10-10 or later that shares two or more tags with an earlier entry. `recurs: none (<reason>)` answers it. |
| What is the weekly count read from? | The `date:` of each entry naming the weak point, per ISO week, from its first occurrence to the week of the run. No cron. |
| Where do the maps go? | `docs/quality/*.html`, gitignored per ADR-0014, built by `scripts/reports.sh standards`, published by `pages.yml`. |

## Use cases and edge cases

- An entry dated before 2026-10-10 is never asked for `recurs:`.
- A level 5 entry may name no eradication path.
- A level 1 to 4 entry whose only eradication path is a `.md` file is
  refused: an instruction edit is level 5.
- A fix commit that existed on a branch and was squashed away does not
  resolve on `main` and is refused.
- A zone that a later rename removes fails the weak-points check on the
  commit that renames it.
- A friction line that a guard hook logged is filed under the wall that
  names the hook, or under the hook itself when no wall does.
- A friction line repeated in the same task counts once.

## Test strategy

Everything here is repository tooling with no screen, so every assertion is
the technical validator's and none is a browser's.

- The pure modules under `scripts/quality/*.core.ts` carry unit tests at
  100% coverage and are mutation-tested with no surviving mutant.
- The schema check is proven to bite by running it over the corpus as it
  stood on `main` before the backfill: it must refuse every entry.
- The three entry points run clean on the backfilled tree, and each is wired
  into `.husky/pre-commit` and `.github/workflows/ci.yml`.
- The enforcement ledger passes with the new mechanisms cited.
