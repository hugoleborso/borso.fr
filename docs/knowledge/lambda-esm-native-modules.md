# Native modules in ESM-bundled Lambdas need `__dirname` (and prefer a WASM swap)

esbuild's ESM output (`OutputFormat.ESM` in `NodejsFunction`'s
`bundling.format`) drops three CommonJS globals that a surprising
number of npm packages still reach for: `require`, `__filename`, and
`__dirname`. Native modules — `argon2`, `bcrypt`, `sharp`, anything
that ships a `.node` binary — also assume `__dirname` exists so they
can locate the prebuilt binding relative to the loader script.

When one of them lands in a pragma-style Lambda, the cold start dies
with:

```
ReferenceError: __dirname is not defined in ES module scope
    at file:///var/task/index.mjs:4:2312
```

The HTTP API then 5xxs every request — there is no per-request
recovery, the module never finishes loading.

## Root cause

Two layers stack:

1. **esbuild's ESM banner is minimal.** Out of the box, the bundled
   `index.mjs` does not synthesise `require`, `__filename`, or
   `__dirname`. CJS code paths that touched them at the source level
   silently turn into runtime crashes.
2. **Native modules cannot run in `/var/task/index.mjs` regardless.**
   Even after defining `__dirname`, `argon2`'s CJS shim looks for its
   `argon2.node` binding in `node_modules/argon2/build/`. esbuild
   doesn't bundle the `.node` file alongside the `.mjs`, so the next
   failure mode is `Cannot find module './build/.../argon2.node'`.

## Eradication

The repo's [`LambdaApi`](../../infra/cdk/src/constructs/lambda-api.ts)
and [`DsqlSchema`](../../infra/cdk/src/constructs/dsql-schema.ts)
constructs now inject a shared banner via
[`esm-cjs-interop-banner.ts`](../../infra/cdk/src/internal/esm-cjs-interop-banner.ts)
that restores all three globals. That fixes the `require('buffer')`
class of failure (smithy + AWS SDK transitive deps) and the
`__dirname` class of failure (native modules at module-load time).

For native modules specifically, prefer a **pure-WASM replacement**
over patching the bundling pipeline. The trade-off is throughput
(typically 3-5× slower than the native binding), which for an
auth-once-per-session shared-password flow is irrelevant.

`pragma`'s shared-password auth swapped `argon2@^0.41.1` for
[`hash-wasm`](https://github.com/Daninet/hash-wasm) (`argon2id` +
`argon2Verify` in `apps/pragma/api/src/auth/auth.service.ts`):

- ~50 KB pure-WASM bundle, no native binding to ship.
- Same encoded output format (`$argon2id$v=19$m=…$t=…$p=…$<salt>$<hash>`),
  interoperable with hashes the native package previously wrote.
- Sibling fixes for the LambdaApi banner went in alongside — both
  layers are documented in case a future app reaches for a native
  module again.

## Detection

Symptoms from the live API side:

- Every `POST /api/auth/login` returns 502 / 5xx with the FE auth
  check falling back to the default route map.
- CloudWatch (`/aws/lambda/<app>-<stage>-api`) shows
  `ReferenceError: __dirname is not defined in ES module scope` as
  the _first_ line of every invocation.
- Coverage gates pass — the trap is bundler-level, only visible at
  Lambda runtime.

## Related

- [`agent-browser-cli-quirks.md`](./agent-browser-cli-quirks.md) — the
  visual-validator agent runs from `agent-browser`; this trap was
  surfaced via a round-3 visual-validation run.
