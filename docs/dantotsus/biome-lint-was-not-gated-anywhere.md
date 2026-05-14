---
date: 2026-05-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: #14
fix-pr: #15
fix-commits: [<to-be-filled-by-kaizen-commit>]
eradication-level: 1
time-to-detect: weeks (3 PRs in)
tags: [biome, ci, hooks, pre-commit]
---

# `biome lint` at root scope was gated by no one — 47 errors sat on `main` in plain sight

## Symptom

While resolving a merge conflict on PR #14, `pnpm exec biome lint` was
run from the repo root for sanity. It returned **47 errors** in
design-export JSX fixtures under `docs/features/borso-fr/12-travaux/
spec/design-export/project/*`, plus 1 new error in `docs/features/
borso-fr/front-page-redesign/spec/design-landing.jsx` that this branch
was adding. The 47 had merged onto `main` via PR #11 and sat there
silently for two PR cycles.

```
docs/features/borso-fr/12-travaux/spec/design-export/project/direction-c.jsx:148:9 lint/a11y/useButtonType
  × Provide an explicit type prop for the button element.
…
Found 47 errors.
Found 18 warnings.
```

None of these errors was blocking, because no automation was reading
the output at root scope. The only consumer was a human running the
command on a whim.

## Root-cause chain

1. **Why** did 47 errors live on `main` at root scope?
   No gate ran `pnpm exec biome lint` from the repo root during the
   PRs that landed them.

2. **Why** wasn't there a root-scope biome gate? Wasn't `pnpm -r lint`
   in CI already running biome?
   Half-true, and that's exactly why it slipped. `.github/workflows/
   ci.yml` runs `pnpm -r lint`, which iterates every workspace and
   runs each one's `lint` script (`biome lint`). Each per-workspace
   `biome.jsonc` has `"files.includes": ["bin/**", "site/**"]` —
   biome only scans the workspace's own source. **Files outside any
   workspace** — `docs/`, `scripts/`, `biome-plugins/`, top-level
   markdown-adjacent code — were never scanned by `pnpm -r lint`.
   The root `biome.jsonc` *would* scan them, but nothing in CI or
   hooks invoked biome from the root.

3. **Why** does scope-narrowed-per-workspace + un-gated-at-root
   produce silent drift?
   Because the assumption "biome lint runs in CI" is true for
   workspace code but false for everything else. The signal "biome
   ran green" was *valid* for the apps; it was *vacuous* for the
   files under `docs/`. The vacuous case is invisible — no error
   message says "biome didn't even look at this file".

4. **Why** were biome-eligible files in `docs/` at all?
   Hand-off bundles from external design tools (Claude Design,
   Figma exports) drop their source files into `docs/features/
   <app>/<slug>/spec/design-export/` as references. Those files
   are *intent documentation*, not source — but they have `.jsx`
   / `.ts` extensions and biome happily lints them. The first time
   PR #11 landed design-export fixtures, biome would have flagged
   them — but no gate looked, so the errors merged. PR #14 added
   one more.

5. **Why** is "if a tool exists in the repo, it must be gated"
   not enshrined anywhere?
   Because the convention is implicit: `package.json` scripts +
   pre-commit + pre-push + CI are *expected* to invoke every
   long-lived tool, but no checklist enforces it. The first time
   a tool is added behind a per-workspace include glob, the root
   surface becomes a blind spot.

**Root cause:** *thought* "biome's presence in CI implies biome's
enforcement"; *actually* `pnpm -r lint` enforces biome only on
files inside workspace `includes` globs, and the repo had grown
biome-eligible files outside any workspace (under `docs/`) that
nothing was gating. The defect-class is "tool with workspace
narrowing + un-gated root scope = invisible drift outside the
workspaces".

## Detection failure causes

- **Typing / unit tests:** N/A — biome is the linter; absent from
  the relevant scope it can't catch anything.
- **Pre-commit hook:** ran `infra/cdk` / `infra/shared` coverage
  conditionally. No biome call at any scope.
- **Pre-push hook:** ran `knip`, `actionlint`, and a script-shadow
  check. No biome call at any scope.
- **CI workflow `ci.yml`:** ran `pnpm -r typecheck` and `pnpm -r
  lint`. The latter executes biome inside each workspace at its
  own `includes` glob — covered `apps/<x>/bin/` + `apps/<x>/site/`
  but missed everything outside (`docs/`, `scripts/`, root-level
  markdown). The CI gate was *partially* there, which made it
  feel covered.
- **Code review:** humans don't run `pnpm exec biome lint` on
  every branch. Biome is supposed to be the automation, not the
  operator's responsibility — and "partially gated" is harder to
  notice than "ungated", because the green check on `pnpm -r lint`
  reads as "biome is fine".

## Countermeasure

The same kaizen PR that captures this dantotsu installs a
two-layer gate so the defect class can no longer reach `main`,
and also excludes the design-export fixtures from biome consideration
so the gate isn't permanently red on `main` for fixture-shape
problems we don't actually want to fix.

- **Code:** PR #15 — adds `pnpm exec biome lint` to `.husky/
  pre-commit` (primary gate, fast feedback) and to `.github/
  workflows/ci.yml`'s `build` job (defense-in-depth, catches
  commits where the hook was bypassed despite the
  no-`--no-verify` rule). The earlier same-PR fix to root
  `biome.jsonc` (`"files.includes": ["**", "!docs/**"]`)
  removes `docs/` from biome's consideration entirely — fixtures
  there document *intent*, not source.

## Eradication (mandatory — code-level)

**Type:** Structural impossibility (level 1 — biome errors at
root scope cannot land on `main` because two independent gates
must both fail for that to happen)

**Reference:** PR #15 · commits `<this-commit>`

**The actual fix:**

Primary gate — `.husky/pre-commit`:

```diff
+# Repo-wide Biome lint at every commit — fast, catches per-file issues
+# before they accumulate in a branch. Runs at root scope so it covers
+# files outside any pnpm workspace (e.g., scripts/, docs/-adjacent code),
+# complementing the per-workspace `pnpm -r lint` step in CI. Biome takes
+# ~1 s on this repo. Rung-1 eradication (combined with the ci.yml backup
+# below) of docs/dantotsus/biome-lint-was-not-gated-anywhere.md — the
+# defect class is now structurally unable to land in main: pre-commit
+# rejects the introducing commit, and if the hook is bypassed CI rejects
+# the PR.
+echo "[pre-commit] running biome lint"
+pnpm exec biome lint
```

Backup gate — `.github/workflows/ci.yml`:

```diff
       - run: pnpm -r typecheck
+      # Per-workspace biome lint (each app's biome.jsonc has its own
+      # `includes` glob — e.g. apps/borso-fr restricts to bin/ + site/).
       - run: pnpm -r lint
+      # Repo-wide biome lint at root scope — covers files outside any
+      # workspace (scripts/, docs-adjacent code, biome-plugins/, etc.).
+      # Defense in depth on top of the .husky/pre-commit gate: catches
+      # commits that bypassed the local hook. Rung-1 eradication (paired
+      # with the pre-commit hook) of
+      # docs/dantotsus/biome-lint-was-not-gated-anywhere.md.
+      - run: pnpm exec biome lint
```

Scope exclusion — root `biome.jsonc` (already shipped in PR #14
post-merge resolution; restated here for completeness because it's
the third leg of the structural fix):

```diff
   "vcs": { … },
+  "files": {
+    "includes": ["**", "!docs/**"]
+  },
   "linter": { … },
```

The three pieces together make the defect-class structurally
unrepresentable:

1. `biome.jsonc` excludes `docs/**` so design-export fixtures
   don't generate noise the project doesn't intend to fix.
2. `.husky/pre-commit` runs biome at root scope — every commit
   pays the ~1-s cost; no commit with a biome error can land
   locally without `--no-verify` (banned by CLAUDE.md).
3. `.github/workflows/ci.yml` runs biome at root scope on every
   PR and every push to main — even if the pre-commit hook is
   bypassed, the PR cannot merge.

A future contributor adding new code outside the existing
workspaces (e.g., a new top-level `tools/` folder) inherits the
gate automatically; the root-scope biome.jsonc covers them by
default.

**Sibling defects swept:** the 47 pre-existing `main` errors are
moot because the `docs/**` exclusion makes them invisible to
biome; they remain on disk as design-intent references. The 1 new
error this branch was adding (`design-landing.jsx`) is swept by
the same exclusion. The pre-commit + CI gates apply prospectively
to every future commit and every future PR.

A simpler eradication ("just add biome to pre-push") was
considered first and rejected for two reasons. **Latency**:
pre-push fires once per branch, so errors accumulate locally
through multiple commits before the developer sees them — biome
is fast enough to enforce per-commit, and the tighter loop is
worth the ~1 s. **Bypass surface**: a single gate has a single
failure mode (hook disabled / `--no-verify` despite the ban /
hook script renamed). Pairing pre-commit with a CI gate removes
that failure mode entirely.

## See also

- [`docs/dantotsus/pnpm-reserved-script-names.md`](./pnpm-reserved-script-names.md) — same family: "the
  hook is the only thing standing between this defect class and
  `main`".
- [`docs/dantotsus/paths-filter-base-head1-on-push.md`](./paths-filter-base-head1-on-push.md) — same family
  (a missing pre-push check let workflow bugs through).
- [`docs/dantotsus/vite-non-module-script-tags-arent-bundled.md`](./vite-non-module-script-tags-arent-bundled.md) — neighbour
  in the pre-push hook script (the gate that was already there).
- [`docs/knowledge/biome-ignore-must-be-single-line.md`](../knowledge/biome-ignore-must-be-single-line.md) — biome quirk
  that occasionally collides with the new gate.
- [`docs/knowledge/biome-stack-overflow-on-dist-binaries.md`](../knowledge/biome-stack-overflow-on-dist-binaries.md) — neighbour:
  biome scope hygiene, but at the workspace level (excluding
  `dist/`). This dantotsu is the matching root-level story.
