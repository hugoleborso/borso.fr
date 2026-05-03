---
date: 2026-05-02
introduced-at: conception
detected-at: operator-deploy
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-commit: daf6ebb
time-to-detect: 30+ minutes of debugging (the symptom looked like AWS, not local)
tags: [pnpm, cdk, monorepo, build-graph]
---

# `pnpm shared-infra deploy` shipped a stale `@borso/infra` dist/

## Symptom

After fixing the host-routing CloudFront Function (ES5 rewrite —
see [`cloudfront-function-runtime-es5.md`](./cloudfront-function-runtime-es5.md))
and committing it, Hugo ran
`pnpm --filter @borso/shared-infra run deploy`. CFN claimed success.
But `aws cloudfront get-function --stage LIVE /tmp/cf-fn.js`
revealed the LIVE bytes were still the broken ES2020 version. The
edge kept returning `503 FunctionExecutionError` for everyone.

User impact: the operator believed they had deployed a fix when they
hadn't. Several rounds of "is this a CloudFront propagation issue?"
debugging went into the void before realising the bytes never left
the laptop.

## Root-cause chain

1. **Why?** The deployed function source is the old version.
   Because the shared stack reads `HOST_ROUTING_FUNCTION_CODE` from
   `@borso/infra` at synth time. That string is loaded by
   `cf-host-routing-function.ts` via
   `readFileSync('dist/internal/cf-host-routing-function.code.js')`
   — i.e. the file in the **compiled `dist/`** directory.
2. **Why is `dist/` outdated?**
   `@borso/infra`'s `build` script runs `tsc` and then `cp`s the
   `.code.js` source file into `dist/internal/`. It only runs when
   explicitly invoked.
3. **Why didn't the shared `deploy` script trigger that build?**
   `infra/shared/package.json`'s deploy was just
   `cdk deploy --all --require-approval never`. No dependency-build
   chain. The dist Hugo had on his laptop was whatever he last
   rebuilt manually — usually stale relative to the source he just
   pulled.
4. **Why does CI not have the same problem?**
   `preview.yml` and `deploy.yml` explicitly run
   `pnpm --filter @borso/infra build` before the cdk step. CI
   always rebuilds; local-only didn't.
5. **Why didn't we notice the asymmetry between CI and local
   sooner?**
   CI was working green for the same PR. Local was the only failure
   path, and it presented as a downstream AWS problem (function on
   the edge "looking wrong"), not as a local-build issue.

**Root cause:** we thought `cdk deploy` rebuilt its dependencies
along the way (the way `npm run` often re-resolves things). Actually
CDK only reads what's on disk; if `dist/` is stale, the deploy ships
stale bytes silently.

## Detection failure causes

- **Typing:** the build chain isn't a type-checked thing.
- **Linter:** no rule for "deploy script must rebuild upstream
  workspace deps".
- **Functional validation locally:** Hugo verified `cdk deploy`
  exited 0 — it did. Nothing in CDK output reveals "the function
  source you bundled was stale".
- **CI:** CI was fine — its workflow rebuilt. So no early signal.
- **Code review:** the deploy script being one line reads as
  minimal, not as missing-a-step.
- **Operator-deploy:** detection happened only when Hugo
  cross-checked the LIVE function's actual bytes against what he'd
  just committed and saw they didn't match.

## Countermeasure

- **Code:** commit `daf6ebb` — `infra/shared/package.json`'s
  `synth`, `diff`, `deploy` scripts now run
  `pnpm --filter @borso/infra run build && cdk ...`. Same for
  `apps/borso-fr/package.json`. `destroy` is left alone (teardown
  doesn't need fresh source).

## Eradication

- **Sibling defects swept:** every `package.json` in the repo whose
  scripts call `cdk` audited. All `synth`/`diff`/`deploy` chain a
  `pnpm --filter @borso/infra run build` first. New apps following
  the templates in `docs/adding-an-app.md` and
  `docs/adding-a-fullstack-app.md` already include the chain.
- **Tooling change:** documented the convention in the handover
  docs. Could go further with a workspace-wide build-graph tool
  (turbo, nx) that rebuilds upstream deps on demand. Overkill for
  a 4-package monorepo.
- **Detection improvement:** a `predeploy` hook script that
  checks whether `dist/index.js` is older than `src/index.ts`
  would catch a regression. Not implemented; the chained build
  step is simpler.
- **Knowledge sharing:** this entry; the package.json scripts
  themselves model the pattern.
