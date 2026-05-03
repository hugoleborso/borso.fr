# `pnpm shared-infra deploy` shipped a stale `@borso/infra` dist

## Symptom

After fixing the host-routing CloudFront Function (ES5 rewrite,
committed and pushed) and running
`pnpm --filter @borso/shared-infra run deploy`, the live function on
the edge was still the broken ES2020 version. `aws cloudfront
get-function --stage LIVE` confirmed the deployed bytes hadn't
changed.

## Root-cause chain

1. **Why** is the deployed function source the old version?
   The shared stack reads `HOST_ROUTING_FUNCTION_CODE` from
   `@borso/infra` at synth time. That string is loaded by
   `cf-host-routing-function.ts` via `readFileSync('dist/internal/
   cf-host-routing-function.code.js')` — i.e. the file in the
   compiled `dist/` directory.
2. **Why** is `dist/` outdated?
   `@borso/infra`'s `build` script runs `tsc` and then `cp` the
   `.code.js` source file into `dist/internal/`. It only runs when
   explicitly invoked.
3. **Why** didn't the shared `deploy` script trigger that build?
   `infra/shared/package.json` had a deploy script of just
   `cdk deploy --all --require-approval never`. No dependency-build
   chain. Locally, after pulling new `.code.js` source, `dist/` is
   whatever it was last built to — usually stale.
4. **Why** does CI not have the same problem?
   `preview.yml` and `deploy.yml` explicitly run
   `pnpm --filter @borso/infra build` before the cdk step. CI
   always rebuilds; local-only didn't.

**Root cause:** `@borso/shared-infra`'s deploy/synth/diff scripts
didn't chain a build of `@borso/infra` first, so the bytes shipped
to the edge depended on whoever last ran `pnpm --filter @borso/infra
build` locally.

## Fix

- **Code:** commit `daf6ebb` — `infra/shared/package.json`'s
  `synth`, `diff`, `deploy` scripts now run
  `pnpm --filter @borso/infra run build && cdk ...`. Same for
  `apps/borso-fr/package.json`. `destroy` is left alone (teardown
  doesn't need fresh source).
- **Operator note:** the chain runs the dependency build every
  time, which is intentional. esbuild + tsc are fast (single-digit
  seconds); the cost of a stale dist is bigger than the cost of a
  redundant rebuild.
- **Convention:** any new package that consumes `@borso/infra` and
  has its own `cdk` invocations should chain
  `pnpm --filter @borso/infra run build &&` into its `synth/diff/
  deploy` scripts. See `docs/adding-an-app.md` /
  `docs/adding-a-fullstack-app.md` for examples.
