# CloudFront Functions runtime 2.0 advertises ES2020 but is stricter

## Symptom

Every request to `https://borso-fr-pr-2.preview.borso.fr/` returned
`HTTP/2 503` with `x-cache: FunctionExecutionError from cloudfront`.
The host-routing `CloudFront Function` source had unit-test coverage
(`new Function(code + '; return handler;')` in vitest) and worked
end-to-end locally; it just failed on the CloudFront edge.

## Root-cause chain

1. **Why** does CloudFront return `FunctionExecutionError`?
   The function threw or produced an invalid response object at
   runtime on the edge.
2. **Why** does it run locally but fail on the edge?
   The local test evaluates the source via Node's `Function` ctor,
   which is a full V8. The CloudFront Functions runtime is a
   QuickJS-based sandbox with restricted ES support, even on
   "JavaScript runtime 2.0".
3. **Why** doesn't the AWS-published feature list match what the
   runtime actually accepts?
   AWS's runtime-2.0 docs claim support for optional chaining,
   nullish coalescing, template literals, etc. In practice the
   runtime is more conservative; certain ES2020 idioms surface as
   `FunctionExecutionError` at the first invocation rather than as
   a parse error at deploy time.
4. **Why** can't we tell which feature tripped the runtime?
   The `TestFunction` API would pinpoint it via
   `FunctionErrorMessage`, but it's frequently unavailable
   (`ServiceUnavailable` 503s). Empirical: rewriting the file in
   ES5 cleared the error.

**Root cause:** CloudFront Functions JS 2.0's effective syntax surface
is narrower than its documented one, and the runtime fails opaquely
at the first invocation rather than at validation/deploy time.

## Fix

- **Code:** commit `a3cd942` — rewrote
  `infra/cdk/src/internal/cf-host-routing-function.code.js` in ES5:
  `var`, string concat, regex literal, no `?.`, no template literals.
  Per-file Biome override exempts `useTemplate`,
  `useOptionalChain`, `noInnerDeclarations` so the linter doesn't
  fight the runtime.
- **Convention:** any future CloudFront Function source in this repo
  uses ES5-only syntax even though the runtime claims to accept more.
  The construct in `infra/cdk/src/internal/cf-host-routing-function.ts`
  reads the `.code.js` file at synth time and ships its bytes to the
  edge — what you write is what runs.

## Related

- After deploying the fix, the function went from `FunctionExecutionError`
  to `FunctionThrottledError` because the previous error rate had
  tripped CloudFront's circuit breaker. See
  [`cloudfront-function-throttle-persistence.md`](./cloudfront-function-throttle-persistence.md).
