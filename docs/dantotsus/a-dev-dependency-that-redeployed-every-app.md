---
date: 2026-10-10
introduced-at: conception
detected-at: operator-deploy
severity: medium
related-pr: '#151'
fix-commits: [21a850ab, self]
eradication-level: 1
time-to-detect: minutes
tags: [ci, github-actions, pnpm, deploy]
eradication-paths: [scripts/deploy/synthesized-output.core.ts, scripts/deploy/synthesized-output.ts, scripts/deploy/apps-whose-output-changed.ts, .github/workflows/deploy.yml, .github/workflows/preview.yml]
zone: .github/path-filters.yml
recurs: none (the earlier entry ran too few app suites on a bump; this one deployed every app on a change that touched none)
---

# A dev dependency that redeployed every app

## Symptom

PR #151 added Playwright as a dev dependency of `apps/pragma` only. Its
preview run deployed `banana-rush` too, and its merge deployed all six apps to
prod. The operator asked: « Why does a development dep launch a redeploy of all
apps? »

## Root-cause chain

1. **Why did every app deploy?** The change touched `pnpm-lock.yaml` and
   `pnpm-workspace.yaml`, which match the `deps` key of
   `.github/path-filters.yml`, and `deploy.yml` and `preview.yml` treated `deps`
   as a fan-out to every app.
2. **Why a fan-out?** `deps` was added after a React bump merged without any
   app suite running ([the earlier dantotsu](./a-dependency-bump-that-no-app-filter-could-see.md)).
   A catalog entry names no app, so "every app" was the only safe answer a path
   filter could give.
3. **Why could a path filter not do better?** It sees which files changed, and
   the lockfile is one file that every app's versions live in. Which app a
   change reaches is in the lockfile's graph, not in its path.

**Root cause:** we thought a dependency file change could only be mapped to
apps by its path, and actually the lockfile already records, per app, the full
set of versions it resolves.

## Detection failure causes

- **CI:** an extra deploy is a success, so nothing fails; each run is green.
- **Code review:** the fan-out was the reviewed fix for the opposite defect,
  so it read as deliberate.
- **Operator:** saw it on the deploy list and asked.

## Countermeasure

- **Code:** commit `e4e34d2` — the workflows ask the lockfile which apps moved.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** PR #154 · commit `e4e34d2` digested each app's lockfile
closure. It still deployed all six apps on an eslint bump, because the root
importer is in every closure. The commit adding this paragraph replaced the
closure with the deploy's own output.

`deploy.yml` and `preview.yml` no longer classify changed files. `detect`
takes the `dorny/paths-filter` keys as candidates only (every app when
`infra` or `deps` matched), then runs
`scripts/deploy/apps-whose-output-changed.ts`, which synthesizes each
candidate with its own `synth` script at the base commit and at the head, and
keeps the apps whose `*.template.json` or `*.assets.json` differ. The
templates name every Lambda and site asset by its content hash, so a byte that
reaches a bucket or a function changes the digest, and a byte that does not
leaves it alone. The synthesis drops `GITHUB_SHA` and `SENTRY_AUTH_TOKEN`, so
the release label every prod Lambda carries cannot make two commits differ.
An app that fails to synthesize on either side counts as changed, and a
failure of the script deploys every candidate, so the comparison can only
remove work. `scripts/pr/deploy-fanout.ts` runs the same comparison, so the
prediction and the merge agree.

This deleted `check-only-change.core.ts`, `drop-check-only-changes.ts`,
`dependency-closure.core.ts` and `apps-with-changed-dependencies.ts`, with
their tests: 1,026 lines and three hand-kept lists (check-only script names,
`TOOLING_FILE_PATTERN`, `PREVIEW_ONLY_FILE_PATTERN`). No new kind of harmless
change needs a new exception.

**Proof it can fail:** with a `lint` script rewrite, a README line, a test
edit and a new dev dependency in `apps/pragma`, the script printed `[]` (base
and head digest `33ae714f…`, measured 2026-11-27). Adding one changed
translation string to `apps/pragma/site/src/i18n/en.json` on top made it print
`["pragma"]` (head `3c2aeb6c…`). The pure half,
`synthesized-output.core.ts`, is at 100% coverage and mutation score.

**Cost, measured locally on 2026-11-27:** `pnpm build` plus `cdk synth --all`
took 10 s (borso-fr) to 21 s (pragma) per app and per commit, 110 s for all
seven apps at one commit, on a 4-core sandbox. With other agents loading the
same machine to about 20, one app at two commits took 142 s to 186 s and all
seven 625 s. GitHub runner timings are unknown until the first run.

**Replayed on PR #411** (`458e886c4`), which added the root dev dependency
`unbash` and deleted unused functions in five apps:
`deploy-fanout.ts 458e886c4^1 458e886c4` printed banana-rush, borso-fr,
pragma and talos, and dropped borsouvertures, last-loop-lepin and skull-king
(measured, 384 s for both commits). The closure rule had every app's digest
move, because the root importer is in each one.

**Sibling defects swept:** `ci.yml` keeps the full fan-out on purpose: a
dependency change should still run every suite.

## See also

- [`a-dependency-bump-that-no-app-filter-could-see.md`](./a-dependency-bump-that-no-app-filter-could-see.md)
- [`paths-filter-base-head1-on-push.md`](./paths-filter-base-head1-on-push.md)
