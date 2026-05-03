---
date: 2026-05-02
introduced-at: implementation
detected-at: production
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-commit: a3cd942
time-to-detect: minutes (first hit on the live preview URL)
tags: [cloudfront, javascript, edge-runtime]
---

# CloudFront Functions runtime 2.0 lies about its ES syntax surface

## Symptom

Every request to `https://borso-fr-pr-2.preview.borso.fr/` returned

```
HTTP/2 503
x-cache: FunctionExecutionError from cloudfront
```

The user saw a CloudFront error page, no app content. The host-routing
function it shipped had complete unit-test coverage and worked end-to-end
against `new Function(code + '; return handler;')` in vitest. It just
failed on the actual edge.

## Root-cause chain

1. **Why?** CloudFront returns `FunctionExecutionError`.
   Because the function threw or produced an invalid response object on the edge.
2. **Why does it throw on the edge but not in vitest?**
   Because vitest evaluates the source via Node's `Function` constructor — full V8.
   The CloudFront edge runs a QuickJS-based sandbox.
3. **Why didn't AWS's "JavaScript runtime 2.0" docs warn us?**
   AWS lists optional chaining, nullish coalescing, template literals as supported.
   In practice the runtime is more conservative than the docs.
4. **Why does the failure surface as `FunctionExecutionError` rather than a
   parse error at deploy time?**
   The runtime accepts the code at validation but errors at first invocation
   on whichever feature it doesn't actually support.
5. **Why couldn't we narrow down which feature?**
   `aws cloudfront test-function` would say so via `FunctionErrorMessage`,
   but it returned `ServiceUnavailable` repeatedly when we tried.

**Root cause:** we thought CloudFront Functions runtime 2.0 supported the
ES2020 features its docs claim (optional chaining, template literals). It
accepts the syntax at deploy time but fails opaquely at first invocation.

## Detection failure causes

- **Typing:** the `.code.js` file is a hand-written JS string read at synth
  time; tsc never sees it.
- **Linter / static analysis:** Biome's `useTemplate` and `useOptionalChain`
  rules ENCOURAGED the syntax that broke. Linter pulled us towards the bug.
- **Functional validation locally:** vitest evaluated the source under Node V8,
  which trivially supports ES2020 — the test was too forgiving.
- **CI:** same — tests ran under Node, no edge runtime in the loop.
- **Code review:** reviewer would need to know runtime 2.0 lies. Tribal knowledge.
- **Staging monitoring:** no staging — preview environments hit the same edge runtime.
- **Production monitoring:** there's no metric for "CF Function 503" alarming
  us before a user does.

## Countermeasure

- **Code:** commit `a3cd942` — rewrote
  `infra/cdk/src/internal/cf-host-routing-function.code.js` in ES5: `var`,
  string concat, regex literal, no `?.`, no template literals. Per-file
  Biome override in `infra/cdk/biome.jsonc` exempts the file from
  `useTemplate` / `useOptionalChain` / `noInnerDeclarations` so the linter
  no longer fights the runtime. The construct in
  `infra/cdk/src/internal/cf-host-routing-function.ts` reads the
  `.code.js` file at synth time and ships its bytes verbatim — what you
  write is what runs on the edge.
- **Operator action:** none beyond redeploying shared after pulling.

## Eradication

- **Sibling defects swept:** only one CF Function in the repo today.
  Documented the pattern in the file's header so any future addition
  follows the ES5 convention.
- **Tooling change:** per-file Biome override + an explanatory comment
  inside the file. Could go further with a Biome-plugin rule "any
  `*.code.js` under `infra/cdk/src/internal/` is ES5-only" if we add
  more CF Functions; not worth it for one.
- **Detection improvement:** AWS's `test-function` API is the right
  detection layer (would have caught this at deploy time) but it's been
  flaky in our experience. Worth retrying once it's stable.
- **Knowledge sharing:** this entry; CLAUDE.md links to it; the file
  header references the constraint.

## Related

After deploying the fix, the function went from `FunctionExecutionError`
to `FunctionThrottledError` for ~10 min — see
[`cloudfront-function-throttle-persistence.md`](./cloudfront-function-throttle-persistence.md).
