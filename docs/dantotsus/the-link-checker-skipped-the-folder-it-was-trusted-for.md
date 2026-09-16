---
date: 2026-09-16
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#89'
fix-pr: '#106'
fix-commits: [96a3ed4a]
eradication-level: 2
time-to-detect: days
tags: [documentation, gates, ci, pre-commit, meta, tooling]
---

# The link checker skipped the folder it was most trusted for

## Symptom

`scripts/docs/check-doc-links.ts` opens every markdown file in the tree and
fails on a link naming a file that is not there. It reports *"every document
link names a file that exists"* on every commit and every CI run.

It was not reading `docs/features/`:

```ts
const HISTORICAL_PREFIX = 'docs/features/';
…
.filter((path) => !path.startsWith(HISTORICAL_PREFIX))
```

That prefix holds three different kinds of document. `validation/` and
`runs/` are dated records — what a validator saw on a given day, what an
agent reported in a round. `spec/` and `plan/` are neither dated nor
historical: they are the two documents an implementer opens first, and
`/technical-conception` and `/implementation` both read them as current.

Narrowing the filter to the dated records alone surfaced six dead links, all
of them in a `spec/` or a `plan/`:

```
docs/features/borso-fr/mondrian-atelier/spec/spec.md:10 → apps/borso-fr/site/art/mondrian/painting.js
docs/features/last-loop-lepin/elevation-profile-under-map/spec/spec.md:93 → ../runner-photos-everywhere/spec/spec.md
docs/features/last-loop-lepin/gpx-speed-aware-projection/plan/plan.md:30 → ../../../knowledge/dsql-postgres-compat-gaps.md
docs/features/last-loop-lepin/gpx-speed-aware-projection/spec/spec.md:112 → (same)
docs/features/last-loop-lepin/self-punch-runners/spec/spec.md:7 → (same)
docs/features/pragma/first-features/plan/plan.md:10 → ../../../adr/0004-pragma-shared-password-auth.md
```

Five of the six are off by one `../`. All five targets exist; an agent
following any of them got a 404 on a document it had been told to read, and
the document it wanted was one directory further up.

## Root-cause chain

1. **Why was `docs/features/` excluded?**
   Because it holds dated records whose links describe a tree that has since
   moved. Excluding them is right: those files record what was true when they
   were written, and `check-dated-records-are-append-only.sh` forbids editing
   them, so a dead link inside one is a finding nobody may act on.

2. **Why did the exclusion reach `spec/` and `plan/` too?**
   The constant is named `HISTORICAL_PREFIX` and the folder was treated as one
   thing. `docs/features/<app>/<slug>/` is a conversation — the spec and plan
   are its living half and the validation records are its frozen half — and
   the filter was written against the folder rather than against the property.

3. **Why did the wrong scope survive?**
   The check passes. A gate that skips its subject reports success, and a
   success message names what it checked, never what it declined to. *"Every
   document link names a file that exists"* is true of the files it read.

4. **Why did nobody following a dead link report it?**
   The same reason four agents absorbed a dead lint command: an agent that
   cannot open a linked file works around it. It greps for the filename, finds
   the real path, and carries on. The cost is real and paid every time, and it
   lands nowhere a human reads.

**Root cause:** the author thought *`docs/features/` is history*, actually
*`docs/features/` is half history and half live instruction*, and the half
that is live is the half an implementer reads first.

## Detection failure causes

- **Typing:** the filter is a correct predicate over strings. There is nothing
  to type-check about which strings it should match.
- **Linter:** none applies.
- **CI:** the check ran and passed, over a corpus that had been filtered
  before it got there.
- **Code review:** `HISTORICAL_PREFIX` reads as a deliberate, explained
  choice. A reviewer agrees that history should be skipped and moves on; the
  question *which of these files is history* is not one the name invites.
- **A test:** `doc-links.core.ts` is gated at 100% coverage and mutation, and
  every one of its tests is about a link inside a document. Which documents to
  open is decided by the caller, and a pure core cannot have an opinion about
  a corpus it never sees.

## Countermeasure

- **Code:** the filter narrowed from a folder to a property, with the property
  named:

  ```ts
  const DATED_RECORD_SEGMENT = /\/(validation|runs)\//;

  function isDatedRecord(path: string): boolean {
    return DATED_RECORD_SEGMENT.test(path);
  }
  ```

  `validation/` and `runs/` are exactly the paths
  `check-dated-records-are-append-only.sh` protects, so the two gates now
  agree on which files are frozen rather than each holding its own idea.
- **The six links fixed**, in the same commit, because the gate would
  otherwise have been added in a red state.

## Eradication (mandatory — code-level)

**Type:** code diff (level 2 — devx check, by widening an existing one)

**Reference:** PR #106 · commit `96a3ed4a` · `scripts/docs/check-doc-links.ts` and `scripts/check-cited-documents-exist.sh`

```diff
-const HISTORICAL_PREFIX = 'docs/features/';
+const DATED_RECORD_SEGMENT = /\/(validation|runs)\//;
+
+function isDatedRecord(path: string): boolean {
+  return DATED_RECORD_SEGMENT.test(path);
+}
…
-    .filter((path) => !path.startsWith(HISTORICAL_PREFIX))
+    .filter((path) => !isDatedRecord(path))
```

Every `spec/` and `plan/` in the repository is now link-checked on every
commit and in CI. Measured on the tree this landed against: 192 markdown files
under `docs/features/`, of which 127 are dated records and stay excluded, and
65 — 43 of them a `spec.md` or a `plan.md` — had never been read by this gate
and now are.
`docs/standards/00-principles.md` carries the reason for what remains
excluded, and dates the narrowing, so the next reader gets the property rather
than the folder.

**Why not check the dated records too:** a dead link inside one is a real
finding and an unactionable one. The file may not be edited — that is a
separate gate with its own dantotsu — so the only available response would be
to suppress the finding, which is the state this change just left.

**The same hole, one surface over.** `check-doc-links.ts` reads markdown, and
a shell script is not markdown, so the line at the top of a gate naming the
dantotsu it eradicates — the only thread from a mechanism back to its
reasoning — was read by nothing at all. Two had rotted:
`check-dated-records-are-append-only.sh` cited
`a-rename-rewrote-the-record-of-a-past-review.md` and
`preflight-preview-recovery.sh` cited
`preview-deploy-orphans-block-recreate.md`. Neither was ever written. Both
headers now state their reason and cite nothing, which is honest, and
`scripts/check-cited-documents-exist.sh` refuses the next one — skipping test
files, where a made-up path is the point and where four of the six matches on
this tree were.

This one was found by the first gate's own failure message during the commit
that added it: the See-also line of this very entry pointed at
`a-rename-rewrote-the-record-of-a-past-review.md`, copied from the shell header
that had been claiming it for months.

**Sibling defects swept:** the six dead links above. Five were an `../`
short; the sixth named a file this very spec's own work deleted, and now names
the module that replaced it. Plus the two dangling script citations.

## See also

- [`the-skill-that-named-the-linter-the-repository-deleted.md`](./the-skill-that-named-the-linter-the-repository-deleted.md) — the same absorption: an agent works around a broken instruction and the cost lands nowhere.
- `scripts/check-dated-records-are-append-only.sh` — the gate this one now agrees with on which files are frozen.
