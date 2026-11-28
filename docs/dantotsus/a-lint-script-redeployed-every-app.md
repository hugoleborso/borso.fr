---
date: 2026-10-12
introduced-at: conception
detected-at: operator-deploy
severity: low
related-pr: '#155'
fix-commits: [0e0d2acf, self]
eradication-level: 1
time-to-detect: minutes
tags: [ci, github-actions, deploy, pnpm]
eradication-paths: [scripts/deploy/synthesized-output.core.ts, scripts/deploy/synthesized-output.ts, scripts/deploy/apps-whose-output-changed.ts, .github/workflows/deploy.yml, .github/workflows/preview.yml]
zone: .github/path-filters.yml
recurs: [a-dev-dependency-that-redeployed-every-app]
---

# A lint script that redeployed every app

## Symptom

PR #155 rewrote one line in eight `package.json` files: the `lint` script, now
`../../scripts/lint-workspace.sh`. Its previews rebuilt every app, and its merge
redeployed all six apps to production with code identical to what was already
running. The operator asked why changing a script in `package.json` triggers a
deploy, and whether it needs to.

## Root-cause chain

1. **Why did every app deploy?**
   `.github/path-filters.yml` gives each app the key `apps/<slug>/**`, which
   matches that app's own `package.json`, and gives `infra` the key
   `infra/cdk/**`, which matches `infra/cdk/package.json`. A matched `infra`
   key fans out to every app.

2. **Why does the filter not see that the change is harmless?**
   `dorny/paths-filter` compares paths, not content. A path cannot tell a
   `lint` line from a dependency version or a `build` script.

3. **Why did the fix for dependency changes not cover it?**
   PR #154 taught the `deps` key to ask the lockfile which apps resolve
   something different, in
   [`a-dev-dependency-that-redeployed-every-app.md`](./a-dev-dependency-that-redeployed-every-app.md).
   That answers the `deps` key only. The same `package.json` also matches its
   app's own key and, for `infra/cdk`, the `infra` key, and neither asks
   anything.

**Root cause:** thought a change to a deployed app's folder always changes the
deployment, actually a `package.json` edit confined to scripts the deploy never
runs leaves the build identical, and only the content of the manifest can say
so.

## Detection failure causes

- **CI:** the deploys succeeded, so nothing was red. The cost is CI minutes and
  six production deploys of unchanged code.
- **Code review:** the workflow comments described the `infra` fan-out as
  intended, which it is for construct changes.

## Countermeasure

None for #155 itself: its deploys were harmless and already done.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** PR #168 · commit `20475f41` dropped check-only keys by a list of
script names. The commit adding this paragraph replaced the list with the
deploy's own output.

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

CI is left unchanged on purpose: a changed `test` or `lint` script still runs
the app's suites, which is exactly when they should run.

## See also

- [`a-dev-dependency-that-redeployed-every-app.md`](./a-dev-dependency-that-redeployed-every-app.md), the `deps` half of the same question.
