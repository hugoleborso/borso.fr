---
date: 2026-11-14
introduced-at: conception
detected-at: review
severity: low
related-pr: '#321'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/check-coupled-lists.sh, CLAUDE.md, docs/standards/01-naming.md]
time-to-detect: days
tags: [drift, gates, agents]
zone: CLAUDE.md
weak-point: prose-stands-in-for-a-check
recurs: [two-copies-that-had-to-agree-and-nothing-made-them]
---

# The lists that named the apps by hand

## User impact

Every agent session reads CLAUDE.md first. After PR #321 merged, two of its
lines were wrong, and PR #321's own body said so:

> CLAUDE.md still calls borsouvertures site-only and omits it from db-read.sh.

| | Seen | Expected |
| --- | --- | --- |
| CLAUDE.md, *Layout* | "`borso-fr` and `borsouvertures` have only `site/`" | borsouvertures has `api/`, `cdk/` and `domain/` since PR #321 (measured with `ls apps/borsouvertures`) |
| CLAUDE.md, *AWS and production data* | `db-read.sh` reads "`pragma`, `last-loop-lepin` and `banana-rush`" | its header lists borsouvertures too since PR #321 |

A second list had drifted the same way. An agent naming a `.store.ts` file
found no definition in the naming standard:

```text
[implementation-02] The suffixes .setup.ts, .store.ts and .adapter.ts count as layer markers in blueprint-utils but the suffix table in docs/standards/01-naming.md does not list or define them.
```

The table defined 8 suffixes, and `LAYER_BY_FILE_SUFFIX` knew 18 (measured).

## Causal chain

- An agent read that borsouvertures has no API and cannot be read with
  `db-read.sh`.
  - PR #321 added `apps/borsouvertures/api` and a `db-read.sh` target, and
    left CLAUDE.md as it was.
    - CLAUDE.md held its own copy of two facts the tree owns:

      ```text
      `borso-fr` and `borsouvertures` have only `site/`. `pragma`, `last-loop-lepin`, `banana-rush` and `talos` add `api/` …
      … scripts/db-read.sh "<one SELECT>"` for `pragma`, `last-loop-lepin` and `banana-rush`.
      ```

      - The app list was already in CLAUDE.md before PR #224. Commit
        `c54e32da7` (PR #224) rewrote it into the line above. The `db-read.sh`
        list was written by commit `3bd18b51f` (PR #199), the day that script
        gained its targets (measured, `git log -S`).
        - Each writer copied the list from the tree as it stood that day. The
          repository's answer to two copies,
          `check-coupled-lists.sh` from PR #49, compares only the pairs someone
          wrote into it. Neither pair was written in.
- An agent naming a `.store.ts` file found no definition in the naming
  standard.
  - `LAYER_BY_FILE_SUFFIX` in `blueprint-utils.ts` gained ten suffixes over
    three months. The table in `01-naming.md`, written on 2026-08-08, kept
    its eight.
    - The same condition: two copies of one list, and a pair list that did not
      name them.

## Root cause of occurrence

*Thought a list in an instruction file is documentation. Actually it is a
second copy of a fact the code owns, and it is born unchecked.* (Method)

The tag is Method because the process for this class adds coverage by hand.
[`two-copies-that-had-to-agree-and-nothing-made-them`](./two-copies-that-had-to-agree-and-nothing-made-them.md)
named the class in PR #49. Its eradication, `check-coupled-lists.sh`, is
itself a list of pairs kept by hand. A new copy is covered only once someone
adds a section. At the time of both writes, CLAUDE.md held no rule against
listing apps. "Never document what goes stale, such as a list of files,
entries, apps" arrived on 2026-11-15, in `8230bcebe` (measured,
`git log -S'goes stale' -- CLAUDE.md`).

## Detection failure causes

- **Gates:** `check-coupled-lists.sh` checks five named pairs. A new pair is
  covered only once someone adds it.
- **Review:** PR #321's author saw the CLAUDE.md drift and wrote it in the
  body, which is a place no later session reads.

## Countermeasure

Remove the copy where the copy is not needed, and gate it where it is.

- CLAUDE.md says what a static and a full-stack app hold, and how to list the
  full-stack ones (`ls -d apps/*/api`). For `db-read.sh` it points at the
  script's header.
- The naming table now defines all 18 suffixes, and section 6 of
  `check-coupled-lists.sh` refuses a suffix the table lacks.

## Eradication

**Type:** DevX check (level 2) for the naming table. For CLAUDE.md, a
subtraction. It no longer holds the lists, and nothing but a written rule
stops a new one.

**Reference:** commit `75bc2bc47` (PR #336), the commit adding this file.

```diff
-`borso-fr` and `borsouvertures` have only `site/`. `pragma`, `last-loop-lepin`, `banana-rush` and `talos` add `api/` …
+A static app has only `site/`. A full-stack app adds `api/` … `ls -d apps/*/api` lists the full-stack ones.
-… scripts/db-read.sh "<one SELECT>"` for `pragma`, `last-loop-lepin` and `banana-rush`.
+… scripts/db-read.sh "<one SELECT>"` for the apps its header lists.
```

```bash
layer_suffixes=$(
  grep -oE "^  \['\.[a-z.]+\.ts'," .claude/skills/blueprint/blueprint-utils.ts |
    grep -oE "\.[a-z.]+\.ts" | sort -u
)
```

**The gap:** section 6 still keeps two copies of the suffix list and compares
them. A third copy elsewhere needs a new section written by hand.

**Proposed:** generate the suffix table's rows in `01-naming.md` from
`LAYER_BY_FILE_SUFFIX` in `.claude/skills/blueprint/blueprint-utils.ts`, the
way `scripts/reports.sh` generates the blueprint index. Then one copy exists,
section 6 of `check-coupled-lists.sh` can be deleted, and a suffix without a
row is impossible.

**Proof it can fail:** the `.store.ts` row deleted from a copy of the table:

```text
[check-coupled-lists] blueprint-utils.ts knows the '.store.ts' layer and the suffix table in docs/standards/01-naming.md does not define it. Add a row, or drop the suffix from LAYER_BY_FILE_SUFFIX.
[check-coupled-lists] two lists that have to agree do not.
exit=1
```

With the row restored, it prints `the coupled lists agree` and exits 0.

**Similar instances:** `grep -n "pragma\`, \`last-loop-lepin\`" CLAUDE.md` finds
nothing now. CLAUDE.md still names apps in three places. The commit scopes are
checked by `scripts/check-app-registration.sh`. The talos exception for
previews and for `db-read.sh` states a rule, not a list. The knowledge entry
`the-production-database-is-out-of-reach-of-a-hosted-session.md` dropped its
list too.
