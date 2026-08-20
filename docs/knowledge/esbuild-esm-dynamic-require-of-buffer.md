---
date: 2026-08-20
introduced-at: infra/cdk
detected-at: lambda cold start
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a (the banner in dsql-schema.ts and lambda-api.ts is the fix)
time-to-detect: hours (the stack deploys green and the function dies on first invoke)
tags: [esbuild, lambda, esm, aws-sdk, dsql, vendor-quirk]
---

# `Dynamic require of "buffer" is not supported` at Lambda cold start

Every `NodejsFunction` in `infra/cdk` is bundled by esbuild as **ESM**, and two
of them ship a banner that injects `createRequire`. That banner is load-bearing:
without it the Lambda deploys successfully and then **fails at cold start**,
which is the worst place to find out.

## The chain

1. `@aws-sdk/dsql-signer` is bundled inline rather than taken from the runtime.
2. It pulls in `@smithy/util-buffer-from`, which calls `require('buffer')`.
3. esbuild's ESM output replaces CJS `require` with an internal `__require`
   shim, and that shim **cannot resolve Node built-ins**.
4. First invocation throws `Dynamic require of "buffer" is not supported`.

The banner defines a real `require` via `node:module`'s `createRequire`, so the
built-in resolves normally.

## Where it lives

The constant is named `NODE_BUILTIN_REQUIRE_SHIM_BANNER`, in
`infra/cdk/src/constructs/dsql-schema.ts` and
`infra/cdk/src/constructs/lambda-api.ts`. The name says what it is; this entry
is what says that deleting it produces a runtime crash rather than a slightly
larger bundle.

## Recognising it

`Dynamic require of "X" is not supported` in CloudWatch on the first invoke
after a deploy, with a green CloudFormation stack. Any Node built-in can appear
as `X`; `buffer` is simply the one this dependency chain reaches first. Adding
a new AWS SDK client to a bundled function is the change most likely to
reintroduce it.
