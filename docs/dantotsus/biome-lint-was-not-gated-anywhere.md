---
date: 2026-05-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: #14
fix-pr: <to-be-filled-by-kaizen-pr>
fix-commits: [<to-be-filled-by-kaizen-commit>]
eradication-level: 2
time-to-detect: weeks (3 PRs in)
tags: [biome, ci, hooks, pre-push]
---

# `biome lint` was gated by no one — 47 errors sat on `main` in plain sight

## Symptom

While resolving a merge conflict on PR #14, `pnpm exec biome lint` was
run for sanity. It returned **47 errors** in design-export JSX fixtures
under `docs/features/borso-fr/12-travaux/spec/design-export/project/*`,
plus 1 new error in `docs/features/borso-fr/front-page-redesign/spec/
design-landing.jsx` that this branch was adding. All 47 had merged
onto `main` via PR #11 and sat there silently for two PR cycles.

```
docs/features/borso-fr/12-travaux/spec/design-export/project/direction-c.jsx:148:9 lint/a11y/useButtonType
  × Provide an explicit type prop for the button element.
…
Found 47 errors.
Found 18 warnings.
```

None of these errors was blocking, because no automation was reading
the output. The only consumer was a human running the command on a
whim.

## Root-cause chain

1. **Why** did 47 errors live on `main`?
   No gate ran `biome lint` during the PRs that landed them.

2. **Why** did no gate run it?
   The pre-commit hook only runs `infra/cdk` / `infra/shared`
   `test:coverage` when those folders change. The pre-push hook runs
   `knip`, `actionlint`, and a workflow-script-name check — but not
   `biome lint`. No GitHub Actions workflow runs `biome lint` either.
   The repo has biome configs at every workspace level *and* per-app
   biome plugin overrides, but nothing pulls the trigger.

3. **Why** was the assumption "biome runs somewhere"?
   biome.jsonc is present, well-configured, and per-workspace overrides
   exist — these *look* like an enforced toolchain. The signal that
   biome is "in the repo" overshadowed the absence of any actual gate.
   Multiple PRs ago, biome may have been a Husky hook; somewhere along
   the way it was dropped and the absence wasn't noticed because the
   errors compound silently.

4. **Why** did it bite now and not earlier?
   Earlier PRs added `*.jsx` files under `docs/` (design-export
   fixtures from the Claude Design hand-off bundles) that biome
   *correctly* flagged — but no one looked. This PR was the first to
   actually run `pnpm exec biome lint` end-to-end and surface the
   accumulated debt.

5. **Why** are `*.jsx` fixtures under `docs/` even biome-eligible?
   The root `biome.jsonc` had no `files.includes` exclusion. `docs/`
   is not source code; design exports shouldn't be linted. Knip
   already ignores `docs/**` (per a previous kaizen); biome had no
   equivalent.

**Root cause:** *thought* "biome's presence implies biome's
enforcement"; *actually* biome is configured but no hook, no
workflow, and no script invokes it as a gate. The 47 errors were the
visible symptom of an invisible missing gate, and the fact that they
sat on `main` without breaking anything meant nobody noticed the
gate was missing in the first place.

## Detection failure causes

- **Typing / unit tests:** N/A — biome is the linter; absent from CI
  it can't catch anything.
- **Pre-commit / pre-push hooks:** the pre-commit checks
  `infra/cdk` / `infra/shared` coverage; the pre-push runs `knip`,
  `actionlint`, and a script-shadow check. Neither runs biome.
- **CI workflows:** `.github/workflows/` runs the preview/prod
  deploy gates (TypeScript build, coverage on infra). No biome lint
  job.
- **Code review:** humans don't run `pnpm exec biome lint` on every
  branch. Biome is supposed to be the automation, not the operator's
  responsibility.

## Countermeasure

The same kaizen PR that captures this dantotsu lands the gate.

- **Code:** commit `<sha-of-prepush-edit>` — adds a `pnpm exec biome
  lint` step to `.husky/pre-push`, right after the existing knip,
  actionlint, and `<script src>` checks.
- **Operator action:** none. Push will fail if biome diagnoses an
  error, the same way it fails today on knip noise.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — push-time enforcement)

**Reference:** this kaizen PR · commit `<this-commit>`

**The actual fix:**

```diff
--- a/.husky/pre-push
+++ b/.husky/pre-push
@@ -33,3 +33,12 @@
 # docs/dantotsus/vite-non-module-script-tags-arent-bundled.md.
 echo "[pre-push] checking app HTML for non-module <script src> tags"
 scripts/check-non-module-scripts.sh
+
+# Repo-wide Biome lint. CI doesn't run Biome and the pre-commit hook only
+# tests infra workspaces, so without this gate biome errors slip onto
+# main silently (PR #14 inherited 47 of them from earlier merges). Push
+# is the right place — biome takes ~1 s and catches real defects (banned
+# type assertions, useEffect smell, useHookAtTopLevel, etc.). Rung-2
+# eradication of docs/dantotsus/biome-lint-was-not-gated-anywhere.md.
+echo "[pre-push] running biome lint"
+pnpm exec biome lint
```

Pairs with `biome.jsonc` gaining `"files": { "includes": ["**",
"!docs/**"] }` in the same PR — without that, `pnpm exec biome lint`
fires on the imported design-export fixtures under `docs/` and the
gate would be permanently red on `main` from PRs that aren't even
about code.

**Sibling defects swept:** the 47 pre-existing `main` errors are
moot because the `docs/**` exclusion makes them invisible to biome;
they remain on disk as fixtures (intent: design reference, not
source). The 1 new error this branch was adding (`design-landing.jsx`)
is swept by the same exclusion. Going forward, every push runs
biome on the actual source surface.

## See also

- [`docs/dantotsus/pnpm-reserved-script-names.md`](./pnpm-reserved-script-names.md) — same family: "the
  hook is the only thing standing between this defect class and
  `main`".
- [`docs/dantotsus/paths-filter-base-head1-on-push.md`](./paths-filter-base-head1-on-push.md) — same family
  (a missing pre-push check let workflow bugs through).
- [`docs/dantotsus/vite-non-module-script-tags-arent-bundled.md`](./vite-non-module-script-tags-arent-bundled.md) — neighbour
  in the pre-push hook script.
- [`docs/knowledge/biome-ignore-must-be-single-line.md`](../knowledge/biome-ignore-must-be-single-line.md) — biome quirk
  that occasionally collides with the new gate.
