---
date: 2026-08-15
introduced-at: implementation
detected-at: local
severity: medium
related-pr: 55
fix-pr: 55
eradication-level: 1
time-to-detect: minutes
tags: [generators, stryker, ci, meta]
blueprints: []
---

# The architecture page counted the mutation sandbox

## Symptom

`scripts/architecture/architecture-graph.ts` reported borso-fr as **70 files**
on a fresh checkout and **210 files** after a push. Nothing about the
application had changed between the two runs. The `--check` gate that guards
the page therefore failed, and passed, for reasons unrelated to any edit.

## Root-cause chain

1. Stryker copies the whole workspace into `apps/<app>/.stryker-tmp/sandbox-*/`
   to mutate it, and leaves the sandbox behind after a run.
2. The directory is gitignored, so it is invisible to `git status` and to every
   check that reads the git index.
3. The architecture generator does not read the index. It walks the filesystem,
   because it needs to resolve imports, and its skip list held `node_modules`,
   `dist`, `cdk.out`, `.git` and `__fixtures__` — every directory that existed
   when the list was written.
4. So the walk descended into the sandbox and counted a second and third copy
   of every source file, with their imports, into the module graph.
5. The generated page is committed and gated with `--check`, so the page's
   content now depended on whether a mutation run had happened in that checkout
   since the last generation.

## Detection failure causes

- **The pollution is invisible to the tools that would have shown it.**
  `git status` says nothing about an ignored directory, and the four blueprint
  generators all skip `.stryker-tmp` already, so three of the four generated
  artefacts stayed correct while the fourth silently doubled.
- **The failure looks like someone else's.** A `--check` failing on a file
  nobody edited reads as a stale artefact somebody forgot to regenerate. The
  obvious response is to regenerate it, which commits the polluted page rather
  than revealing the cause. That is what happened; the wrong page was committed
  before the count was questioned.
- **The skip list is a denylist.** It can only be right about directories that
  existed when it was written, and it had no way to say what it was actually
  trying to exclude, which is "anything that is not source I own".

## Countermeasure

`.stryker-tmp` and `coverage` join the skip list, with a comment naming the
measured symptom so the next reader knows what the entry is for.

## Eradication

Rung 1 for this instance, and the reason it is only rung 1 for the class:

- [`scripts/architecture/architecture-graph.ts`](../../scripts/architecture/architecture-graph.ts)
  skips both directories, and the generator returns 70 again.

The general fix would be to derive the walk from `git ls-files` rather than
from the filesystem, which makes every ignored directory invisible by
construction rather than by enumeration. The three checks written in this pull
request — `convention-drift.ts`, `hotspots.ts` and `enforcement-ledger.ts` — all
do exactly that and are immune to this by design. The architecture generator
cannot follow them without more work: it resolves imports, so it needs to see
files the index does not track in the same shape, and rewriting its walk was
out of scope for the change that found this.

## What to check next time

A generator that walks the filesystem is one new tool away from being wrong.
When adding one, ask whether it can read `git ls-files` instead. When it
genuinely cannot, the skip list needs a comment saying what it is trying to
exclude, so the next person adding a build tool knows to extend it.
