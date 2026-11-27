---
date: 2026-09-16
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#89'
fix-commits: [96a3ed4ad5]
eradication-level: 2
eradication-paths: [scripts/check-named-paths-exist.sh, scripts/docs/check-doc-links.ts]
time-to-detect: days
tags: [documentation, gates, ci, pre-commit, meta, tooling]
zone: scripts/docs/check-doc-links.ts
---

# The link checker skipped the folder it was most trusted for

## User impact

Agents implementing a feature open its `spec/` and `plan/` first. Six links in
those documents named files that were not there, while the link gate reported
*"every document link names a file that exists"* on every commit.

| | Seen | Expected |
| --- | --- | --- |
| An agent follows a link in a spec or a plan | A 404 on a document it had been told to read. Five of the six targets existed one `../` further up | The linked document opens |
| The link gate on every commit and CI run | Passes | Fails on a dead link in a living document |

The six links, measured by narrowing the filter on 2026-09-16:

```
docs/features/borso-fr/mondrian-atelier/spec/spec.md:10 → apps/borso-fr/site/art/mondrian/painting.js
docs/features/last-loop-lepin/elevation-profile-under-map/spec/spec.md:93 → ../runner-photos-everywhere/spec/spec.md
docs/features/last-loop-lepin/gpx-speed-aware-projection/plan/plan.md:30 → ../../../knowledge/dsql-postgres-compat-gaps.md
docs/features/last-loop-lepin/gpx-speed-aware-projection/spec/spec.md:112 → (same)
docs/features/last-loop-lepin/self-punch-runners/spec/spec.md:7 → (same)
docs/features/pragma/first-features/plan/plan.md:10 → ../../../adr/2026-05-19T1955-pragma-shared-password-auth.md
```

## Causal chain

- An agent following a link in a spec or a plan got a 404.
  - The link gate never opened any file under `docs/features/`, so it
    reported success over a corpus that excluded every spec and plan:

    ```ts
    const HISTORICAL_PREFIX = 'docs/features/';
    // …
    .filter((path) => !path.startsWith(HISTORICAL_PREFIX)) // drops spec/ and plan/ too
    ```

    - Commit `d28c25c75` ("a link is a claim about the tree, and nothing was
      checking it") wrote that filter. Its message says `docs/features/` is
      skipped "entirely, because a report from May naming a file since renamed
      is telling the truth about May".
      - The folder holds two kinds of document. `validation/` and `runs/` are
        dated records. `spec/` and `plan/` are the living documents
        `/technical-conception` and `/implementation` read as current. At
        `d28c25c75^` nothing in the tree named which documents are dated
        records: `check-dated-records-are-append-only.sh` was added five days
        later, in `d6dd5ba5a` (measured, `git log --diff-filter=A`). The
        folder name stood in for the property.

## Root cause of occurrence

*Thought `docs/features/` is history. Actually it is half history and half
live instruction, and the live half is the half an implementer reads first.*
(Machine)

The commit message quoted above states the belief. The tree gave the author no
property to filter on, only a folder, so the folder became the filter.

## Detection failure causes

- **CI:** the check ran and passed. A gate that skips its subject reports
  success, and its message names what it checked, never what it declined to.
- **Review:** `HISTORICAL_PREFIX` reads as a deliberate, explained choice. The
  name invites no question about which of these files is history.
- **Tests:** `doc-links.core.ts` is gated at 100% coverage and mutation, and
  every test is about a link inside a document. Which documents to open is the
  caller's choice, outside the pure core.
- **Agents as users:** an agent that cannot open a linked file greps for the
  name, finds the real path and carries on. The cost is paid every time and
  lands nowhere a human reads.

## Countermeasure

Commit `96a3ed4ad` narrowed the filter from the folder to a named property, and
fixed the six links in the same commit so the gate did not land red:

```ts
const DATED_RECORD_SEGMENT = /\/(validation|runs)\//;

function isDatedRecord(path: string): boolean {
  return DATED_RECORD_SEGMENT.test(path);
}
```

Measured on the tree it landed against: 192 markdown files under
`docs/features/`, of which 127 dated records stay excluded and 65, 43 of them a
`spec.md` or a `plan.md`, are now checked.

The same commit claimed this list matched what
`check-dated-records-are-append-only.sh` protects. It did not. At `96a3ed4ad`
that gate protected `docs/**/validation/**` and `docs/standards/reviews/**`,
not `runs/`. Today it protects only `docs/**/validation/**` (measured, line 23
of the script). So the countermeasure rebuilt the defect one level up: two
gates each keep their own copy of "which files are frozen", and the copies
differed on the day they were written.

## Eradication

**Type:** DevX check (level 2), with a measured gap.

**Reference:** commit `96a3ed4ad`, in `scripts/docs/check-doc-links.ts` and
`scripts/check-named-paths-exist.sh`. Both hold today.

```diff
-const HISTORICAL_PREFIX = 'docs/features/';
+const DATED_RECORD_SEGMENT = /\/(validation|runs)\//;
…
-    .filter((path) => !path.startsWith(HISTORICAL_PREFIX))
+    .filter((path) => !isDatedRecord(path))
```

Every `spec/` and `plan/` is link-checked on every commit and in CI. The same
commit added `scripts/check-named-paths-exist.sh`, which refuses a path named
in a shell header or in backticks that does not exist. That surface had rotted
too: two gate headers cited dantotsus that were never written.

**The gap:** the 9 `runs/` folders (102 files) are skipped by the link check as
if frozen, yet no gate freezes them. Running the checker with `runs/` included
finds 4 dead links, all under
`docs/features/pragma/first-features/runs/2026-05-19-1937-pragma/agents/`
(measured, 2026-11-27). The reason given for skipping them, "a finding nobody
may act on", is false for `runs/`.

**Proposed:** keep one list of dated-record paths and have both gates read it.
For example, `check-doc-links.ts` reads `DATED_RECORD_PATHS` from the
append-only script, or both read one file. Then the link gate can skip only
what the append-only gate freezes, and the two cannot disagree. Until then,
`runs/` should be link-checked.

**Proof it can fail:** replacing `/\/(validation|runs)\//` with
`/\/validation\//` in a scratch copy of the checker printed the 4 dead links
above and exited non-zero.

**Similar instances:** `grep -rn "DATED_RECORD\|HISTORICAL" scripts` finds the
two copies named above and no third.
