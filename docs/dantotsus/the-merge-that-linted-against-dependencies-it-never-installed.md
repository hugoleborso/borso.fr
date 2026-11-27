---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#141'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/ensure-installed.sh, .husky/pre-commit, .husky/pre-push, scripts/lint-workspace.sh]
time-to-detect: minutes
tags: [gates, pre-commit, pnpm, oxlint, hooks]
zone: .husky/pre-commit
recurs: [the-cache-outlived-the-install-it-was-built-against]
---

# The merge that linted against dependencies it never installed

## User impact

The operator saw nothing. The main session of PR #334's sweep merged `main`,
and the merge commit failed pre-commit until the session ran `pnpm install` by
hand.

| | Seen | Expected |
| --- | --- | --- |
| Merge of `main` into PR #334, 2026-11-14 | oxlint failed with `type error` on the merged files | the merge commits, or pre-commit installs first |

## Causal chain

- The merge commit was refused.
  - oxlint's type-aware rules, run by pre-commit, could not resolve a newly
    merged app's imports.
    - `main` had brought a lockfile entry this checkout had never installed,
      and pre-commit linted against the old `node_modules`.
      - The only install step sat in `.husky/pre-push`, before knip. Commit
        `f3307abf2` (PR #141, the sweep of PR #136) put it there:

        ```bash
        if ! cmp -s pnpm-lock.yaml node_modules/.pnpm/lock.yaml; then
          pnpm install --frozen-lockfile
        fi
        ```

        - Its input was one refusal: knip, the first pre-push gate, reported a
          new app's dependencies as unused after a restart from a newer main.
          The commit message names knip and no other gate.

## Root cause of occurrence

*Thought a stale install was a pre-push problem, because knip was the gate that
had failed, actually every gate that reads `node_modules` reads it stale,
pre-commit's type-aware lint included.*

**M: Material.** The sweep fixed what its input reported. The friction it was
built from named one gate, and the step went in front of that gate. The
commit's own comment says "Every gate below reads node_modules", which scopes
the step to the gates below it in one file (inferred from that wording).

## Detection failure causes

- **Local:** a merge that brings a new dependency is rare in a sweep's
  checkout, and a plain commit never moves the lockfile.
- **Review:** PR #197 (`9dcf74547`) deleted the only other lockfile
  comparison, the refusal in `scripts/lint-workspace.sh`. That file's comment
  listed it as one of "two things" that kept a stale ESLint cache from forming,
  so it left with the cache. The commit's "Properties that change" do not name
  it. It never guarded pre-commit, which called `lint-changed-files.sh`, but
  it was the one place the property was written down
  (`git log -S'node_modules/.pnpm/lock.yaml' -- scripts/lint-workspace.sh`).

## Countermeasure

`scripts/ensure-installed.sh` holds the comparison and the install. Pre-push,
pre-commit and `lint-workspace.sh` all call it. When the two files agree it
costs 6 ms (measured).

## Eradication

**Type:** DevX check (level 2). Each entry point that calls it installs before
any gate reads `node_modules`.

**Reference:** the commit adding this file.

```diff
+# A merge of main can bring a lockfile this checkout never installed, and the
+# type-aware oxlint rules then fail on modules they cannot resolve.
+scripts/ensure-installed.sh pre-commit
```

**Proof it can fail:** after appending a line to `node_modules/.pnpm/lock.yaml`,
the script printed `[pre-commit] pnpm-lock.yaml changed since the last install;
installing before the gates read node_modules` and ran `pnpm install`. With the
two files equal it printed nothing and exited 0.

The property holds only where an entry point calls the script. A new hook or
script that reads `node_modules` without calling it reopens the defect, so
this is not eradicated.

**Proposed:** move the call from the entry points into the scripts that read
`node_modules`. Each of `scripts/lint-staged-files.sh`,
`scripts/lint-repository.sh` and the other readers would start with
`ensure-installed.sh`, so the property travels with the reader. Pre-commit and
pre-push would then need no install step of their own.

**Similar instances:** `grep -rln 'node_modules/.bin' .husky scripts/*.sh`
lists the readers. Pre-push and pre-commit run before all of them, and
`lint-workspace.sh` is the one an app's `pnpm run lint` reaches without a hook.
