# ADR-0014 — Generated files are not committed

- **Status:** proposed
- **Date:** 2026-08-20
- **Decided in:** PR [#70](https://github.com/hugoleborso/borso.fr/pull/70)

## Context

Fourteen files in this repository were written by a generator and committed
next to the source they were derived from. Each had a `--check` mode that
regenerated the file and compared the result to the copy in git, and pre-commit
and CI both ran it, so a commit that moved the source without regenerating the
output was refused.

The arrangement has a failure mode that grows with the number of branches. A
generator rewrites its whole output on any change, so two branches that each
touch one source file produce two full rewrites of the same generated file, and
git reports a conflict across the whole thing. The conflict carries no
information: the resolution is always to run the generator again, and it is not
something a person can do correctly by reading the two sides.

Measured over the last two hundred commits on `main`, the two most-changed
files in the repository were both generated:

| File | Commits touching it | Written by |
| --- | --- | --- |
| `.claude/skills/blueprint/blueprint-index.md` | 42 | `blueprint-indexing.ts` |
| `.claude/skills/blueprint/blueprint-coverage.html` | 35 | `blueprint-heatmap.ts` |
| `docs/architecture/pragma-architecture.json` | 15 | `architecture-graph.ts` |
| `docs/standards/enforcement-ledger.md` | 14 | `enforcement-ledger.ts` |

Merging `main` into a two-day-old feature branch conflicted in three files, all
three generated, none of them touched by hand on either side.

The repository had already reached this conclusion once, for a subset. The
architecture pages were removed from git in an earlier change, and the comment
that removed them says why: `pages.yml` regenerates before publishing and
`architecture.yml` regenerates before diffing, so no consumer ever opened the
committed bytes, and the byte gate's only subject was its own output. That
argument was then not applied to the model file sitting beside each page, whose
`.gitignore` comment argued the opposite — that every byte of the model comes
from the working tree, "so a gate on it means something". Both halves of that
sentence are true and the conclusion does not follow: a gate can only mean
something if a reader would otherwise be misled, and no reader reads it.

## Decision

**A file is committed when it is an input and ignored when it is an output.**

An input is something a person wrote or accepted that no command can recompute.
An output is derived from the tree by a generator that every reader runs first.

Committed, as inputs:

- `docs/standards/convention-baseline.json` — a count a person accepted with
  `--accept`, and the thing the ratchet compares against.
- `docs/standards/seals.jsonl` — an attestation that a review happened, which
  nothing can recompute from the tree.
- The CloudFormation template snapshots — their diff *is* the review artefact.

Ignored, as outputs: the blueprint index, heatmap and context lookup; the
blueprint-defects, enforcement-ledger, convention-drift, rule-provenance,
hotspots and temporal-coupling reports; and the architecture model beside each
already-ignored page.

**`--check` now means "validate without comparing".** Every generator's check
mode used to do two things: report real problems, and diff its output against
git. The second half is deleted, because there is nothing to diff against. The
first half is what the gates were worth — an annotation naming no blueprint, a
dantotsu naming none, an external system no manifest declares, a question the
tree had already answered being answered a second way. Two generators had
nothing but the byte comparison, so their check mode is gone entirely and they
no longer run on the commit at all.

**Each output keeps an address.** `pages.yml` regenerates all of them on every
push to `main` and publishes them beside the architecture maps, so a report is
still one link away, from a phone, without a checkout.

**Each output is produced locally before anything reads it.** `scripts/reports.sh
[all|blueprints|standards|maps]` regenerates them, grouped because the map build
is fourteen seconds and the blueprint index is one. The SessionStart hook runs
the blueprint group synchronously and the rest in the background; CI runs all of
it immediately after `pnpm install`, before the first check that reads one.

**Every skill and agent that opens one runs that command itself.** A session
hook is not enough: a subagent given its own worktree never runs it, and a
blueprint added during a session is not in the index until it is rebuilt.
`/implementation`, `/blueprint`, `/code-standards` and `/route` run
`blueprints`; the standards reviewer runs `standards`; `/open-pr` runs `maps`.
A new skill that reads a generated file carries the same line.

## Alternatives considered

**Keep committing them, and merge with a union driver.** A `.gitattributes`
merge strategy can resolve an append-only file, but none of these is
append-only: a generator rewrites the whole file, so there is no union to take.

**Keep committing them, and regenerate during conflict resolution.** This is
what already happens, and it is the cost being removed rather than a fix. It
also depends on whoever resolves the conflict knowing which files are
generated, which is exactly the knowledge a newcomer or an agent does not have.

**Stop generating some of them.** The reports are read; the problem was never
that they exist.

## Consequences

**A generated file no longer renders on github.com.** A link from a document to
`enforcement-ledger.md` resolves on a checkout and 404s in the web UI. The
published copy is the answer for a person; the links themselves stay relative,
because most of them sit in `CLAUDE.md` and `.claude/skills/**` and are read by
an agent with a checkout, for which a URL would be worse.

**`check-doc-links.ts` had to widen.** It resolved a link against the git index
on purpose — `docs/architecture/README.md` once linked five ignored pages that
worked locally and failed in CI. That reasoning depended on CI not running the
generators, which it now does before the first check that reads one, so the
checker accepts a path that is ignored *and* on disk. An ignored path that is
absent is still a dead link, which is what would catch a generator that stopped
producing one.

**A gate moved from the commit to nowhere, for two files.** The heatmap and the
provenance report are no longer checked by anything, because there was nothing
in them to check. If either generator breaks, the first sign is a missing or
malformed page on the published site rather than a red commit.

**A fresh checkout is briefly incomplete.** Between `git clone` and the first
generator run, the blueprint context lookup does not exist. The pre-write hook
is best-effort and exits 0 without it, so the failure is silent — an agent
writes a file with no blueprint in front of it and nothing says so. This is why
SessionStart produces that one synchronously rather than in the background, and
it is the sharpest edge this decision has.

**`seals.jsonl` had to change shape.** It stays committed, and appending to its
end conflicted for the same mechanical reason. It is now rewritten in path
order on every record, so two branches sealing different files touch different
regions and merge on their own; two branches sealing the same file still
conflict, which is a real disagreement.

## The one committed ledger is written in path order for the same reason

`docs/standards/seals.jsonl` is an input, so it stays committed — and it is
written **sorted by path**, never appended to.

A JSONL file that grows at the end conflicts on every concurrent edit: two
branches sealing two unrelated files both append at the same last line, and git
has to ask. Rewriting the whole ledger in path order puts unrelated edits in
different regions of the file, so git merges them without asking. What is left
is the conflict that carries information — the same file sealed twice, on two
branches, with different content hashes — which is exactly the case a person
should look at.

`writeSealLedgerInPathOrder` in `scripts/standards/seal.ts` is named after this
property; appending would be faster and would reintroduce the conflicts.
