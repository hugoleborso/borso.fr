---
date: 2026-09-16
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#89'
fix-pr: '#106'
fix-commits: [4154b33a]
eradication-level: 2
time-to-detect: days
tags: [adr, git, gates, pre-commit, ci, meta, documentation]
---

# An ADR number goes to whoever writes it first, and both branches were first

## Symptom

Merging `main` into the audience-voting branch produced a folder holding two
records numbered 0015 and two numbered 0016:

```
docs/adr/0015-musicbrainz-stays-the-song-search-source.md          (branch, 2026-08-26)
docs/adr/0015-per-member-credentials-replace-the-shared-password.md (main,   2026-09-14)
docs/adr/0016-qrcode-react-for-the-audience-vote-qr-code.md         (branch, 2026-08-26)
docs/adr/0016-simplewebauthn-carries-the-passkey-flow.md            (main,   2026-09-14)
```

Git reported no conflict on any of the four. The slugs differ, so from git's
point of view the branch added two files and `main` added two others.

An ADR is cited by number — from `CLAUDE.md`, from the standards, from other
ADRs, and by `/open-pr`, which pulls every record a branch references into the
pull-request body. *ADR-0015* had stopped naming one thing.

Resolving it renamed the branch's pair to 0019 and 0020, which produced the
second half of the symptom: `0020-qrcode-react-…` went on opening with the
heading `# ADR-0016: …`. The rename moved the filename and the heading stayed
where it was, so the document told its reader it was the record about
passkeys. The `docs/adr/README.md` index kept a row numbered 0015 describing
the branch's original draft, beside `main`'s genuine 0015.

## Root-cause chain

1. **Why did two records share a number?**
   Each branch read `docs/adr/`, saw 0014 as the highest, and took 0015 and
   0016. Both were correct about the tree they could see.

2. **Why did the merge not surface it?**
   A number collision in a folder is not a text conflict. Two files with
   different names are two files; git has no notion that the digits at the
   front of a name are a claim on a shared namespace.

3. **Why did nothing else surface it?**
   The repository had a gate for exactly this shape — twice over, for
   migrations, in `check-migration-numbering.sh` and `check-migration-numbers.sh`
   (see [`the-loop-shipped-the-same-gate-twice`](./the-loop-shipped-the-same-gate-twice.md)).
   Neither looked at `docs/adr`. Both were written from the pull request that
   had just hit the problem, and neither author asked which other folders have
   the same shape.

4. **Why did the branch's number survive eight weeks without being noticed?**
   The branch took 0015 on 2026-08-26 and `main` took it on 2026-09-14. For
   nineteen days there was nothing to see: on each side the number was free
   when it was taken and unique afterwards. The collision does not exist until
   the merge, and the merge is not a moment anybody is reading ADR numbers.

5. **Why did the renumber leave a heading behind?**
   `git mv` renames a file; nothing reads what is inside it. The number
   appears in three places — the filename, the heading, the index row — and
   only the first is what the rename operates on.

6. **Why did review not catch the stale heading?**
   The renumber landed inside a merge commit that also resolved a schema
   slice, an adapter and eleven test files. A one-line heading inside a
   118-line file that git reports as a rename is not where attention goes.

**Root cause:** the author thought *a number is a name I pick*, actually *a
number is a claim on a namespace shared with every branch open at the same
time*, and a namespace with no registry is allocated by whoever merges last
being wrong.

## Detection failure causes

- **Typing / linter:** markdown; nothing to type, and no linter reads a
  filename as a claim.
- **Functional validation locally:** an ADR does nothing at runtime. A
  duplicate number breaks citation, which nothing executes.
- **CI:** `check-doc-links.ts` verifies that every markdown link resolves. All
  four files existed, so every link to them resolved — to the wrong one, when
  the link was written before the merge.
- **Code review:** the collision is visible only in a folder listing. A diff
  shows two files being added, which is what adding two ADRs looks like.
- **The existing gates:** two of them checked precisely this shape, for
  migrations only, because each was scoped to the folder that had just failed.

## Countermeasure

- **Code:** the branch's pair renumbered to 0019 and 0020, `0019`'s heading
  and metadata lines normalised to the shape the other nineteen use, `0020`'s
  heading corrected from `ADR-0016:` to `ADR-0020:`, and the stale 0015 row
  removed from the index.
- **Rewritten, not renamed:** the branch's 0015 argued for MusicBrainz as the
  search source, which `main`'s ADR-0017 had already settled otherwise. It was
  rewritten as ADR-0019 about what the room's search actually needed, and says
  so in its own Context section rather than leaving a reader to wonder why
  0019 is dated after 0017 decided the same area.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check), two of them

**Reference:** PR #106 · commit `4154b33a` · `scripts/check-numbered-sequences.sh`
and `scripts/check-adr-numbers-resolve.sh`

**1. The collision itself.** `check-numbered-sequences.sh` replaces the two
migration-only scripts with one that takes a list of folders where the leading
number is the order:

```diff
+SEQUENCE_GLOBS=(
+  'apps/*/api/src/database/migrations:sql:migration'
+  'docs/adr:md:architecture decision record'
+)
```

Adding a sequence is one line, which is the point: the third occurrence of
this shape had no gate because the first two gates were each written for one
folder. Verified by dropping a decoy `docs/adr/0019-a-decoy.md` beside the
real 0019, which exits 1 naming both.

**2. The rename's aftermath.** `check-adr-numbers-resolve.sh` refuses a
record whose heading states a different number from its filename, a record
with no index row, and an index row linking a record that is gone:

```diff
+  heading_number="$(echo "$heading" | sed -n 's/^#[[:space:]]*ADR[ -]\{0,1\}\([0-9][0-9]*\).*/\1/p')"
+  if [ "$heading_number" != "$filename_number" ]; then
+    echo "[check-adr-numbers-resolve] $record: the heading says ${heading_number}" >&2
```

Verified against the defect itself: restoring `# ADR-0016:` at the top of
`0020-qrcode-react-…` exits 1 and names it. Its index half fired immediately
on the tree it was written against — nine of twenty records had no row,
having accumulated since ADR-0011 in a table whose comment says *manually
curated*.

Both are wired into `.husky/pre-commit` and `ci.yml`, and cited in
`docs/standards/12-linting-and-gates.md`, which is what the enforcement ledger
requires of a mechanism that runs.

**Sibling defects swept:** `0019`'s `- Status:` / `- Date:` lines, which the
first draft wrote without the bold the other nineteen records use; the stale
index row; and the nine missing ones.

## See also

- [`the-loop-shipped-the-same-gate-twice.md`](./the-loop-shipped-the-same-gate-twice.md) — why the two gates that would have caught this covered one folder each.
- [`two-branches-took-the-same-migration-number.md`](./two-branches-took-the-same-migration-number.md) — the same shape in `migrations/`.
- [`a-generated-file-cannot-contain-its-own-commit.md`](./a-generated-file-cannot-contain-its-own-commit.md) — another defect that exists only once two branches meet.
