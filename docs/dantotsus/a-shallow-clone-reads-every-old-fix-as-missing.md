---
date: 2026-10-12
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#162'
fix-pr: '#173'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/quality/check-dantotsu-front-matter.ts, scripts/install-repo-deps.sh]
time-to-detect: minutes
tags: [git, tooling, session-start, meta]
zone: scripts/quality/check-dantotsu-front-matter.ts
recurs: none (paths-filter-base-head1-on-push is a CI checkout depth; this is the session clone and the record check)
---

# A shallow clone reads every old fix as missing

## Symptom

An agent auditing the dantotsu record for PR #162 found fix commits that did
not resolve on main, entry after entry, and started counting them as broken
records. The session clone held 322 commits, all from the last ten days, so
every fix commit older than that was absent. After `git fetch --unshallow`
most of them resolved.

## Root-cause chain

1. **Why did old commits not resolve?** They were not in the clone.
2. **Why?** The hosted session's clone was shallow, and nothing at session
   start deepened it.
3. **Why did the check not say so?** `check-dantotsu-front-matter.ts`
   listed every unresolved commit first and mentioned shallow clones only in
   its closing paragraph, after the reader had already started reading the
   list as findings.

**Root cause:** the check's author thought an unresolved commit means a
wrong record, but in a shallow clone it means a missing history, and the two
look identical in the output.

## Detection failure causes

- **CI:** the CI job checks out with `fetch-depth: 0`, so CI never shows it.
- **Functional validation locally:** a local clone is full; only hosted
  sessions start shallow.

## Countermeasure

- The check refuses a shallow clone before resolving anything, with one line
  naming the cause and the command.
- SessionStart (`scripts/install-repo-deps.sh`) fetches the full history when
  the clone is shallow, so a session does not start in one.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check)

**Reference:** [PR #173](https://github.com/hugoleborso/borso.fr/pull/173) · commit `self` (this entry ships with it)

**The actual fix:**

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

```diff
+if [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" = true ]; then
+  log "this clone is shallow; fetching the full history so old commits resolve"
+  git fetch --quiet --unshallow origin ||
+    note_missing 'full git history' "git fetch --unshallow failed, ..."
+fi
```

**Sibling defects swept:** `scripts/quality/weak-points.ts` builds its map
from the front matter alone and resolves no commit, so it is unaffected. The
check above is the only tool that resolves fix commits.

## See also

- [`paths-filter-base-head1-on-push.md`](./paths-filter-base-head1-on-push.md), the CI form of a missing history.
