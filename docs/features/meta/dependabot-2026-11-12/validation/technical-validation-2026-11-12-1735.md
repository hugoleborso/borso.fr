# Technical validation — API Lambdas import the Hono adapter from `@hono/aws-lambda`

- Spec: ADR-2026-11-12T1724 [`../../../../adr/2026-11-12T1724-api-lambdas-import-the-hono-adapter-from-hono-aws-lambda.md`](../../../../adr/2026-11-12T1724-api-lambdas-import-the-hono-adapter-from-hono-aws-lambda.md)
- Plan: none. A dependency batch has no plan, so this report has no plan row.
- Branch: claude/vigilant-archimedes-0ckzp8
- Base: origin/main (b9d8f46517fe4900485165f36364647f0a52a0f5)
- Run at: 2026-11-12T17:29:06Z
- Round: 1
- Reviewed: f2cf2b013f861283bb1269cf3c0144c6d8e7bff6
- Touched workspaces: @borso-app/pragma, @borso-app/talos, @borso-app/banana-rush, @borso-app/last-loop-lepin, root (devDependencies, catalog, lockfile)

The ADR is the contract. Category A has one row per sentence of *Decision* and per bullet of *Consequences* that names something the code does, plus one row per file under *Implementation pointers*. No merge commit sits above the base (`git rev-list --merges origin/main..HEAD` printed nothing). 0 use cases routed to /visual-validation. The change has no screen.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Decision | "Import from `@hono/aws-lambda`" (pragma) | apps/pragma/api/src/main.ts:1 | `import { handle, type LambdaContext, type LambdaEvent } from '@hono/aws-lambda';` | PASS |
| A02 | Decision | same, talos | apps/talos/api/src/main.ts:2 | `import { handle } from '@hono/aws-lambda';` | PASS |
| A03 | Decision | same, banana-rush | apps/banana-rush/api/src/main.ts:2 | `import { handle } from '@hono/aws-lambda';` | PASS |
| A04 | Decision | same, last-loop-lepin | apps/last-loop-lepin/api/src/main.ts:1 | `import { handle } from '@hono/aws-lambda';` | PASS |
| A05 | Decision | No source still imports the deprecated subpath | `grep -rn "hono/aws-lambda" apps infra` (excluding `@hono/…`) | no match in any `.ts`/`.tsx`/`package.json` | PASS |
| A06 | Decision | "at 1.0.1 with a peer range of `hono >=4.13.9 \|\| ^5.0.0-0`" | node_modules/@hono/aws-lambda/package.json | `"version": "1.0.1"`, `"hono": ">=4.13.9 \|\| ^5.0.0-0"`; lockfile resolves `'@hono/aws-lambda@1.0.1(hono@4.13.18)'`, one hono version (`hono@4.13.18`) in the lockfile | PASS |
| A07 | Decision | "exports the same `handle`, `LambdaEvent` and `LambdaContext`" | @hono/aws-lambda/dist/index.d.ts:4 | `export { …, type LambdaContext, type LambdaEvent, defaultIsContentTypeBinary, getConnInfo, handle, streamHandle };`; `dist/handler.js` differs from `hono/dist/adapter/aws-lambda/handler.js` only in comments and the `@deprecated` tags (diffed) | PASS |
| A08 | Decision | "Each app lists it through the workspace catalog" | pnpm-workspace.yaml:12; apps/{pragma:44,talos:35,banana-rush:34,last-loop-lepin:34}/package.json | `'@hono/aws-lambda': '^1.0.1'`; `"@hono/aws-lambda": "catalog:",` in all four | PASS |
| A09 | Consequence `+` | "The build check passes" | `pnpm run lint` (scripts/lint-repository.sh, the step that failed CI) | exit 0; `typescript/no-deprecated` is `error` on `**/*.ts` in `.oxlintrc.json` and not turned off for `apps/*/api/src/main.ts` | PASS |
| A10 | Consequence `+` | "hono 5 needs no change to the Lambda entry points" | @hono/aws-lambda peer range | `"hono": ">=4.13.9 \|\| ^5.0.0-0"` covers hono 5 | PASS |
| A11 | Consequence `~` | "pragma's `main.test.ts` mocks the new module path" | apps/pragma/api/src/main.test.ts:13 | `vi.mock('@hono/aws-lambda', () => ({ handle: () => httpHandler }));` | PASS |
| A12 | Implementation pointers | `pnpm-workspace.yaml` carries the catalog entry and the batch's bumps | pnpm-workspace.yaml:12-14 | `'@hono/aws-lambda': '^1.0.1'`, `'@hono/node-server': '^2.1.3'`, `hono: '^4.13.16'` | PASS |
| A13 | Criteria "Users see no change" | The Lambda bundle still resolves the adapter | esbuild bundle of apps/talos/api/src/main.ts into the scratchpad | exit 0; the bundle carries `node_modules/.pnpm/@hono+aws-lambda@1.0.1_hono@4.13.18/node_modules/@hono/aws-lambda/dist/handler.js` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Names carry intent, no abbreviations | read the 5 changed source lines | only module specifiers changed | PASS |
| B02 | No magic numbers or strings | same | none added | PASS |
| B03 | No prose comments | `git diff origin/main...HEAD -- apps \| grep -nP '^\+.*(//\|/\*)'` | none found | PASS |
| B04 | Type assertions limited to `as const` / `as unknown` | same grep for ` as [A-Z]` | none found | PASS |
| B05 | No `any` | grep `\bany\b` on added lines | none found | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | added lines | no index access added | PASS |
| B07 | Lint clean on changed files | `pnpm exec oxlint --type-aware` on the four `main.ts`, the four `main.dev.ts` and `main.test.ts` | exit 0 | PASS |
| B08 | Lint clean on the whole repository (the CI step that failed) | `pnpm run lint` | exit 0 with oxlint 1.91.0 | PASS |
| B09 | knip | `pnpm run knip` | exit 0; 11 configuration hints, none an error | PASS |
| B10 | Typecheck | `pnpm --filter <app> run typecheck` for the four apps | exit 0 each, including `main.dev.ts` against `@hono/node-server` 2.1.8, whose `serve(options, listeningListener?: (info: AddressInfo) => void)` matches all four call sites | PASS |
| B11 | `useEffect` is a smell | grep on changed `.ts`/`.tsx` | none found | PASS |
| B12 | Standards checklist, every `reviewer` bullet | read each changed source file in full (the four `api/src/main.ts`) | each file changes one import specifier. No VOCABULARY.md, repository, form, route, comment or disable comment is added. No bullet applies | PASS |
| B13 | Blueprint `api-lambda-entrypoint` | apps/pragma/api/src/main.ts:34 | `// @FollowsBlueprint api-lambda-entrypoint` still sits above `export const handler`. The import change does not alter the shape | PASS |
| B14 | Docs that name the code's adapter module stay true | `grep -rn "hono/aws-lambda" docs/knowledge` | docs/knowledge/hono-lambda-base64-encodes-text-calendar.md:12 says `` `hono/aws-lambda` decides per response whether the body is binary `` and points at `dist/adapter/aws-lambda/handler.js` (hono 4.13.7). docs/knowledge/apigw-http-api-has-no-response-streaming.md:27 says `` (`handle` from `hono/aws-lambda`) ``. Both are printed by a hook to an agent working on `main.ts`, which now imports `@hono/aws-lambda`, whose file is `dist/handler.js`. Behaviour is unchanged, so only the pointer is stale. Introduced: this branch; Fix size: two lines | FAIL (non-blocking) |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed b9d8f46517fe4900485165f36364647f0a52a0f5 --reporter=verbose --coverage` | 0. Ran `api/src/main.test.ts`, 5 tests passed, including "returns what the HTTP handler answered" | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed b9d8f46517fe4900485165f36364647f0a52a0f5` | 0. 1 file, 8 tests passed | PASS |
| C03 | @borso-app/talos | core `--changed` with the full base SHA, then `test:e2e --changed` | 0 and 0. "No test files found". `api/src/main.ts` has no test, so no file is affected | PASS |
| C04 | @borso-app/banana-rush | same | 0 and 0. "No test files found", for the same reason | PASS |
| C05 | @borso-app/last-loop-lepin | same | 0 and 0. "No test files found", for the same reason | PASS |
| C06 | all four | mutation (`scripts/mutate-changed.sh`) | not run. No `.core`, `.utils` or `.adapter` file or its test changed | PASS |
| C07 | all four | every `*.utils.ts` has a sibling `*.utils.test.ts` | 99 utils files, 0 missing | PASS |
| C08 | @borso-app/pragma | `vite build` (pdfjs-dist 6.4.299 to 6.5.438 moves the worker URL import) | 0, `✓ built in 10.50s` | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | The entry points import `handle` from `@hono/aws-lambda`, not the deprecated subpath (A01-A05) | **structural:** `typescript/no-deprecated: "error"` on `**/*.ts` in `.oxlintrc.json` refuses any import of the `@deprecated` `hono/aws-lambda` `handle`, and `pnpm run lint` exits 0 (B08). That lint failure is what failed CI on the Dependabot pull requests | PASS |
| D02 | pragma's handler returns what the adapter's handler answers | `it('returns what the HTTP handler answered', …)` at apps/pragma/api/src/main.test.ts:66, asserting `await expect(handler(HTTP_EVENT)).resolves.toEqual({ statusCode: 200 });` at :69, with the mock at main.test.ts:13 on `'@hono/aws-lambda'`. If `main.ts` still imported `hono/aws-lambda`, the mock would not apply and the real adapter would answer instead of `httpHandler` (inferred, not probed) | PASS |
| D03 | The adapter answers exactly as before (Criteria "Users see no change") | **structural:** `@hono/aws-lambda/dist/handler.js` is the same code as `hono/dist/adapter/aws-lambda/handler.js` at 4.13.18 apart from comments, `@deprecated` tags and import paths (diffed this session). The esbuild bundle resolves it (A13) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Check-then-write | `git diff origin/main...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts' \| wc -l` printed `0`. The diff writes nothing to a database | PASS |
| E02 | none | Per-process state | `grep -n "^let \|new Map\|new Set" apps/*/api/src/main.ts` found nothing. The diff adds no module-level variable. `const httpHandler = handle(app)` at pragma main.ts:21 already existed | PASS |

## Blocking findings

- none

## Non-blocking findings

- B14. Two knowledge entries name `hono/aws-lambda` and its old file path as the module the entry points run: docs/knowledge/hono-lambda-base64-encodes-text-calendar.md:12 and docs/knowledge/apigw-http-api-has-no-response-streaming.md:27.

## Notes

- `--changed` runs only the tests that import an edited source file. A lockfile or catalog bump counts as no change (measured: pragma ran only `main.test.ts` though its `package.json` changed), so the other upgrades in this batch ran no test here: drizzle-orm 0.45.4, @tanstack/react-query 5.106.0, react 19.3.1, @sentry/* 11.10.0, @hono/node-server 2 (a major), lucide-react 1.68.0 and marked 18.1.3. The typecheck of all four apps, the pragma `vite build` and the whole-repository lint all pass (measured). The core and e2e suites run in full in CI. Does the operator want this batch's pull request held until CI's full suite is green before merge?
- `@hono/node-server` 2.1.8 declares `"engines": { "node": ">=20" }`. The repository runs Node 22 (`node -v` printed v22.23.4). It is used only in the four `main.dev.ts` local servers, so a deployed Lambda never loads it.

## Verdict: PASS
