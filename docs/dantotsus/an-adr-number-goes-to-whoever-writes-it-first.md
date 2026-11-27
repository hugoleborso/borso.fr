---
date: 2026-09-16
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#89'
fix-commits: [4154b33a23, c54e32da7, 2d59df1c1]
eradication-level: 1
eradication-paths: [scripts/check-adr-numbers-resolve.sh, scripts/check-numbered-sequences.sh, .claude/skills/adr/SKILL.md]
time-to-detect: days
tags: [adr, git, gates, pre-commit, ci, meta, documentation]
zone: docs/adr
recurs: [two-branches-took-the-same-migration-number]
---

# An ADR number goes to whoever writes it first, and both branches were first

## User impact

An ADR is cited by number, from `CLAUDE.md`, the standards, other ADRs, and
`/open-pr`, which pulls every record a branch cites into the pull-request
body. Merging `main` into the audience-voting branch made two numbers name two
records each:

```
docs/adr/0015-musicbrainz-stays-the-song-search-source.md          (branch, 2026-08-26)
docs/adr/0015-per-member-credentials-replace-the-shared-password.md (main,   2026-09-14)
docs/adr/0016-qrcode-react-for-the-audience-vote-qr-code.md         (branch, 2026-08-26)
docs/adr/0016-simplewebauthn-carries-the-passkey-flow.md            (main,   2026-09-14)
```

| | Seen | Expected |
| --- | --- | --- |
| A citation of *ADR-0015* | Two records answer it | One record |
| `0020-qrcode-react-…` after the renumber | Its heading still read `# ADR-0016: …`, the passkey record's number | `# ADR-0020: …` |

Every reader of a citation to 0015 or 0016 was affected, and every agent that
`/open-pr` fed those records. Git reported no conflict on any of the four
files.

## Causal chain

- Two records shared the numbers 0015 and 0016 after the merge.
  - Each branch took 0015 and 0016, the highest number it could see plus one.
    - The `/adr` skill told the agent to pick the number that way
      (`git show 9e8c67b93:.claude/skills/adr/SKILL.md`, line 108):

      ```markdown
      3. **Pick the number.** Find the highest 4-digit prefix across the
         listing and add 1. Pad to 4 digits.   <!-- ❌ the local tree only -->
      ```

      - The skill allocated from one branch's tree, while every branch open at
        the same time drew from the same namespace (Method).
  - Git merged both pairs, because two files with different slugs are two
    files to git.
- The renumbered `0020-qrcode-react-…` kept the heading `# ADR-0016:`.
  - `git mv` renamed the file and left its content as it was. The number lived
    in three places, the filename, the heading and the index row, and the
    rename moved one.

## Root cause of occurrence

*Whoever wrote the skill's numbering step thought an ADR number is a name the
author picks, actually it is a claim on a namespace shared with every branch
open at the same time, and a namespace with no allocator is allocated by
whoever merges last being wrong.* (Method)

Each agent followed the skill correctly. The step itself could not see the
other branch. The same shape had already hit migrations
([`two-branches-took-the-same-migration-number`](./two-branches-took-the-same-migration-number.md)),
and its two gates each covered only the migrations folder
([`the-loop-shipped-the-same-gate-twice`](./the-loop-shipped-the-same-gate-twice.md)).

## Detection failure causes

- **Linter:** markdown, and no linter reads a filename as a claim.
- **CI:** `check-doc-links.ts` checks that every link resolves. All four files
  existed, so every link resolved, to the wrong record when it was written
  before the merge.
- **Existing gates:** `check-migration-numbering.sh` and
  `check-migration-numbers.sh` checked this exact shape, scoped to the folder
  whose failure each was written from.
- **Review:** the collision shows only in a folder listing. The diff showed
  two files added, which is what adding two ADRs looks like. The stale heading
  sat in a merge commit that also resolved a schema slice, an adapter and
  eleven test files.

## Countermeasure

The branch's pair became 0019 and 0020. `0020`'s heading was corrected to
`ADR-0020:`, `0019`'s metadata lines took the shape of the others, and the
stale 0015 index row was removed. The branch's 0015 argued for MusicBrainz,
which `main`'s ADR-2026-09-15T2023 had settled otherwise, so it was rewritten
as ADR-2026-09-16T1931 about what the room's search needed.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit `c54e32da7` (#224, 2026-10-29) named new ADRs by the UTC
minute they are written. Commit `2d59df1c1` (#290, 2026-11-11) renamed records
0001 to 0052 to that form. `scripts/check-adr-numbers-resolve.sh` refuses a
file that does not start with a minute id:

```bash
ID_PATTERN='[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{4}'
# …
  if ! [[ "$filename" =~ ^(${ID_PATTERN})- ]]; then
    failed=1
```

An id taken on one branch is no longer a guess about the others: two branches
collide only when both write an ADR in the same UTC minute. That case, and the
heading that disagrees with its filename, are refused at commit by the two
gates of commit `4154b33a` (PR #106), which still run:

- `scripts/check-numbered-sequences.sh` refuses two records with one id, in
  every folder listed in its `SEQUENCE_GLOBS`.
- `scripts/check-adr-numbers-resolve.sh` refuses a heading whose id differs
  from the filename, a record with no index row, and an index row whose record
  is gone.

**Proof it can fail:** at the time, a decoy `docs/adr/0019-a-decoy.md` beside
the real 0019 made `check-numbered-sequences.sh` exit 1 naming both. Restoring
`# ADR-0016:` at the top of `0020-qrcode-react-…` made
`check-adr-numbers-resolve.sh` exit 1 naming it (measured on 2026-09-16).

**Proposed:** migrations are still numbered in sequence, and held at level 2
by `check-numbered-sequences.sh`. drizzle-kit 0.31.11, the version in
`pnpm-workspace.yaml`, accepts `migrations: { prefix: 'timestamp' }` in
`defineConfig` (read in its `index.d.ts`: `prefixes = ["index", "timestamp",
…]`). Setting it in each `apps/*/drizzle.config.ts` would name new migrations
by time, so two branches could no longer take the same migration number, and
the migrations line of `SEQUENCE_GLOBS` could then go. Existing journals keep
their names.

**Similar instances:** `grep -n "SEQUENCE_GLOBS" -A4 scripts/check-numbered-sequences.sh`
lists the two numbered families, ADRs and migrations. Commit `bdd93b705`
(2026-10-02, "the second ADR 0021 becomes 0022") shows the number-based scheme
colliding again after the gate shipped, before the rename to minute ids.
