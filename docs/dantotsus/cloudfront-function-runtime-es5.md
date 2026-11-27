---
date: 2026-05-02
introduced-at: implementation
detected-at: production
severity: high
related-pr: '#2'
fix-commits: [a3cd942c34, d5714aebf0]
eradication-level: 4
eradication-paths: [infra/cdk/src/internal/cf-host-routing-function.code.js, infra/cdk/test/unit/eradication-checks.test.ts, .oxlintrc.json]
time-to-detect: minutes (first hit on the live preview URL)
tags: [cloudfront, javascript, edge-runtime]
zone: infra/cdk/src/internal/cf-host-routing-function.code.js
blueprints: [cloudfront-function-source]
---

# A CloudFront Function that passed every test threw on every request at the edge

## User impact

Every preview URL showed a CloudFront error page instead of the app.
Measured by the session that opened PR #2, on its first request.

| | Seen | Expected |
| --- | --- | --- |
| `https://borso-fr-pr-2.preview.borso.fr/` | `HTTP/2 503`, `x-cache: FunctionExecutionError from cloudfront` | `200` and the borso.fr page |

All previews were affected, because one host-routing function serves
every preview host. Production apps were not, since they do not use it.

## Causal chain

- CloudFront answered 503 `FunctionExecutionError` on every preview request.
  - The viewer-request function threw at its first invocation on the edge runtime (`FunctionRuntime.JS_2_0`, measured at `infra/shared/lib/shared-stack.ts:77` in a3cd942c34).
    - The deployed source was the version written in e9d91494c. It used `const`, `let`, template literals, `?.` and a `\d` regex. Which of them the edge rejected is unknown: no run on the real runtime ever named the line.

      ```js
      // e9d91494c, cf-host-routing-function.code.js
      const host = request.headers.host?.value;     // optional chaining
      const prMatch = sub.match(/^(.+)-pr-(\d+)$/); // \d escape
      request.uri = `/${prefix}${app}/pr-${pr}${uri}`; // template literal
      ```

      - Commit e9d91494c moved the source out of a TypeScript string into a real `.js` file. Its message says it "Promoted to CloudFront Functions JS runtime 2.0 idioms: const/let, template literals, optional chaining (?.)". The source it replaced was already in `var` and string concatenation, and had never run on the edge (measured, `git show e9d91494c^:infra/cdk/src/internal/cf-host-routing-function.ts`).
        - The agent checked the rewrite with the only harness the repository had. The message ends on "Tests still 73 passing at 100% coverage". Those tests evaluate the source with Node's `new Function`, which is V8, not the CloudFront runtime.
          - The edge was not reachable from that loop. The shared stack that deploys the function did not exist yet (it arrived 40 minutes later in 68af89935), and no step in the repository ran the source on the CloudFront runtime.

## Root cause of occurrence

*Thought a syntax rewrite that keeps the Node tests green keeps the
function working on the edge, actually those tests run V8, and the
CloudFront runtime is a separate engine that only `aws cloudfront
test-function` or a live request can exercise.*

Tag: **Material** (agentic rule). The tool that held the answer, a run on
the real runtime, was absent from the agent's context when it wrote the
line. AWS documents optional chaining and template literals as supported
in runtime 2.0, so the docs in hand pointed the other way. The fix commit
a3cd942c34 confirms nobody isolated the construct: "TestFunction has been
flaky enough that diagnosing the precise trigger isn't worth it".

## Detection failure causes

- **Typing:** the `.code.js` file is read as a string at synth time, so `tsc` never sees it.
- **Linter:** the linter of the day (Biome) had `useTemplate` and `useOptionalChain` on, so it pushed toward the modern syntax.
- **Local and CI tests:** they evaluate the source under Node V8, which accepts all of ES2020. No test runs on the CloudFront runtime.
- **Pre-production:** previews are the first environment that runs the edge function, and `test-function` returned `ServiceUnavailable` when the session tried it (reported in the original entry, not reproduced).
- **Monitoring:** no alarm watches CloudFront Function execution errors.

## Countermeasure

Commit a3cd942c34 rewrote the function in `var` and string concatenation,
replaced `\d` with `[0-9]` and hardened the host-header guard. The
previews answered again after a redeploy of the shared stack and the
throttle described in
[`cloudfront-function-throttle-persistence`](../knowledge/cloudfront-function-throttle-persistence.md)
cleared. Since four changes shipped together, the countermeasure works
without proving which construct was at fault.

## Eradication

**Type:** detection (level 4).

**Reference:** commit [`d5714aebf0`](https://github.com/hugoleborso/borso.fr/commit/d5714aebf0)
added the source test. The Biome override of 92d6ae2442 is gone: commit
314f24821 replaced Biome, and the same exemption now lives in
`.oxlintrc.json` under `"files": ["**/*.code.js"]`, which turns off
`prefer-template` and `no-var`.

```ts
// infra/cdk/test/unit/eradication-checks.test.ts
describe('eradication: cf-host-routing-function uses ES5-only syntax', () => {
  const sourcePath = path.join(INTERNAL_DIR, 'cf-host-routing-function.code.js');
  it('uses var, not let or const, for variable declarations', () => {
    expect(stripped).not.toMatch(/\b(let|const)\s+\w+\s*=/);
  });
  // also: no `?.`, no template literal, no import or export
});
```

What holds today has two gaps. The test forbids syntax that was never
shown to be the cause. It also reads one file by path, while
`infra/cdk/src/internal/` holds three `.code.js` files, all deployed on
`JS_2_0`.

**Proof it can fail:** measured on 2026-11-27. Turning `var
API_PATH_PREFIX` into `const` and running the test gives `× uses var,
not let or const, for variable declarations` and `AssertionError:
expected 'var PREVIEW_PARENT_DOMAIN = …' not to match
/\b(let|const)\s+\w+\s*=/`. The file was reverted.

**Proposed:** run each function on the real runtime before it serves
traffic. A step in `shared-deploy.yml`, and in the app deploys that ship
the `static-site.ts` functions, would call `aws cloudfront test-function`
on the DEVELOPMENT stage with a sample `<app>-pr-<n>` event and fail on a
non-empty `FunctionErrorMessage` before publishing to LIVE. A function
that throws on the edge, whatever construct makes it throw, could then
never reach LIVE. The ES5 regex test could then be deleted.

**Similar instances:** `ls infra/cdk/src/internal/*.code.js` lists
`cf-api-viewer-address.code.js` and `cf-static-site-index-rewrite.code.js`
beside this one. `grep -nE '\b(let|const)\s|\?\.|=>' ` on both finds
nothing, so they are already ES5, but no test reads them.
