---
date: 2026-10-12
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#162'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/quality/check-dantotsu-front-matter.ts, scripts/install-repo-deps.sh]
time-to-detect: minutes
tags: [git, tooling, session-start, meta]
zone: scripts/quality/check-dantotsu-front-matter.ts
recurs: none (paths-filter-base-head1-on-push is a CI checkout depth; this is the session clone and the record check)
---

# A shallow clone reads every old fix as missing

## User impact

An agent auditing the dantotsu record for PR #162 read
`check-dantotsu-front-matter.ts`'s output and counted fix commits that did
not resolve on main as broken records, entry after entry.

| | Seen | Expected |
| --- | --- | --- |
| The check in a hosted session | a list of fix commits "missing from main" | the records that are really wrong, or a refusal naming the shallow clone |

The session clone held 322 commits, all from the last ten days. After
`git fetch --unshallow` most of the listed commits resolved (measured in that
session).

## Causal chain

- The agent counted valid records as broken.
  - Branch 1: the commits did not resolve.
    - They were not in the clone.
      - The hosted session started from a shallow clone of 322 commits.
        **Machine:** the container clones shallow, and SessionStart ran on
        that clone as it was.
  - Branch 2: the agent read the list as findings.
    - The check printed every unresolved commit first, and the shallow case
      last, in its closing paragraph:

      ```ts
      'A shallow clone resolves no old commit: run `git fetch --unshallow` first.\n',   // ← the faulty line
      ```

      - Commit 702c1b2d7 (PR #162) wrote the check. Its author knew a shallow
        clone breaks the resolution, and wrote that knowledge as a sentence
        after the list instead of testing for it.

## Root cause of occurrence

*Thought a closing note about shallow clones would keep a reader from
misreading the list, actually the reader acts on the list it reads first, and
a shallow clone is one git command away from being refused.* **Man:** the
author had the fact in hand, since the same line states it, and chose a
written reminder where a check was possible.

`git rev-parse --is-shallow-repository` answers `true` or `false`, which is
what the countermeasure now calls.

## Detection failure causes

- **CI:** the CI job checks out with `fetch-depth: 0`, so CI never shows it.
- **Local validation:** a local clone is full. Only hosted sessions start
  shallow, so the author's own runs never printed the misleading list.

## Countermeasure

The check refuses a shallow clone before it resolves anything, with one line
naming the cause and the command:

```diff
+function refuseShallowClone(): void {
+  if (runGit(['rev-parse', '--is-shallow-repository']).trim() !== 'true') return;
+  process.stderr.write(
+    '[check-dantotsu-front-matter] this clone is shallow, so every fix commit older than its ' +
+      'cut-off would read as missing from main. Run `git fetch --unshallow origin` and check again.\n',
+  );
+  process.exit(1);
+}
```

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file, in PR #173 (e51cfdd5a on main).

Two changes hold today. The check refuses a shallow clone
(`check-dantotsu-front-matter.ts:18`). SessionStart removes the cause, so a
session does not start shallow (`scripts/install-repo-deps.sh:78`):

```diff
+if [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" = true ]; then
+  log "this clone is shallow; fetching the full history so old commits resolve"
+  git fetch --quiet --unshallow origin ||
+    note_missing 'full git history' "git fetch --unshallow failed, ..."
+fi
```

**Proof it can fail:** not pasted when the entry was written. The refusal
runs before any resolution, on the one condition
`--is-shallow-repository` reports.

**Similar instances:** `scripts/quality/weak-points.ts` builds its map from
the front matter alone and resolves no commit, so it is unaffected. The check
above is the only tool that resolves fix commits.
