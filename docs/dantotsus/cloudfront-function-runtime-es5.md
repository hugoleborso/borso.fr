---
date: 2026-05-02
introduced-at: implementation
detected-at: production
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-pr: https://github.com/hugoleborso/borso.fr/pull/4
fix-commits: [a3cd942, 92d6ae2, d5714ae]
eradication-rung: 4
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

## Eradication (rung 4 — source-level detection test)

- **Rung:** 4 (detection). A vitest in
  `infra/cdk/test/unit/eradication-checks.test.ts` reads
  `cf-host-routing-function.code.js` and asserts: no `let`/`const`
  variable declarations, no optional chaining (`?.`), no template
  literals. Combined with the per-file Biome override that turns
  off the `useTemplate`/`useOptionalChain`/`noInnerDeclarations`
  rules, the linter no longer pushes you toward the broken
  syntax AND a hard test fails CI if the patterns sneak in.
- **Why not rung 1 (structural):** the file is JS source shipped
  to a foreign runtime (CloudFront edge); we can't impose CDK
  types on it. The closest rung-1 fix would be transpiling from
  ES2020 → ES5 at build time, but that's a build chain for one
  small file. Rung 4 is the realistic ceiling.
- **What changed:**
  - `infra/cdk/src/internal/cf-host-routing-function.code.js` —
    full ES5 rewrite (`var`, string concat, no `?.`, no template
    literals).
  - `infra/cdk/biome.jsonc` — per-file override exempting the
    file from `useTemplate` / `useOptionalChain` /
    `noInnerDeclarations`.
  - `infra/cdk/test/unit/eradication-checks.test.ts` (new) —
    asserts the ES5 patterns hold.
- **PR:** [#2](https://github.com/hugoleborso/2) (rewrite +
  Biome) and [#4](https://github.com/hugoleborso/borso.fr/pull/4)
  (test backstop).
- **Commits:**
  [`a3cd942`](https://github.com/hugoleborso/borso.fr/commit/a3cd942)
  (ES5 rewrite),
  [`92d6ae2`](https://github.com/hugoleborso/borso.fr/commit/92d6ae2)
  (Biome override),
  [`d5714ae`](https://github.com/hugoleborso/borso.fr/commit/d5714ae)
  (test).
- **Diff snippet (essence of the fix):**
  ```diff
  - const request = event.request;
  - const host = request.headers.host?.value;
  + var request = event.request;
  + var host = request.headers.host && request.headers.host.value;
  …
  - request.uri = `/${prefix}${app}/pr-${pr}${uri}`;
  + request.uri = '/' + prefix + app + '/pr-' + pr + uri;
  ```
- **Sibling defects swept:** only one CF Function in the repo
  today; the test covers any future `*.code.js` files added to
  `src/internal/` as well (it currently only checks the existing
  file by path; extend the glob if more are added).

## See also

- After deploying the fix, the function went from
  `FunctionExecutionError` to `FunctionThrottledError` for
  ~10 min — see
  [`../knowledge/cloudfront-function-throttle-persistence.md`](../knowledge/cloudfront-function-throttle-persistence.md).
