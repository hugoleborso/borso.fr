# Technical validation — Visitor QR code

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none (Tier 1). [ADR-2026-11-27T1426](../../../../adr/2026-11-27T1426-qr-code-library-for-visitor-qr.md) stands beside the spec.
- Branch: claude/amazing-cannon-2sikty
- Base: ac0e4d8b3795f824bf4763200bc5b4c1912b0d27
- Run at: 2026-11-27T14:48:37Z
- Round: 2
- Reviewed: 6aa6f1968c5513aa532c72f15cc0357cc547fdd6
- Touched workspaces: @borso-app/pragma (site tests and one `INVARIANTS.md` only)

This round reads only `git diff d23d988ee9ba409cdf71fb4d3664e69e31a08501..HEAD`. It holds two commits. One adds the round-1 report. The other changes `VisitorQrCodeAction.test.tsx` and `routes/home/INVARIANTS.md`. No source file changed, and the fix carries no new scope. HEAD stayed at the reviewed SHA through every lint, test and probe run. No merge commit sits above the round-1 SHA. The fix commit's message dismisses no finding ("Fixes round-1 findings D11, D14, B08 and B25."), so no dismissal row is needed. 4 use cases are routed to /visual-validation, as in round 1, and are out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Round-2 scope | The fix changes no behaviour that round 1 checked | diff | `git diff d23d988..HEAD --stat` lists only `VisitorQrCodeAction.test.tsx`, `routes/home/INVARIANTS.md` and the round-1 report. `VisitorQrCodeAction.tsx` is unchanged (probes below restored it, and `git status --short` printed nothing) | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | D11 (blocking): no test checks what the drawn code encodes | `6aa6f19` apps/pragma/site/src/components/organisms/VisitorQrCodeAction.test.tsx:46-59, `it('draws a code that encodes the sign-up page at the root of the current origin')`. It renders a reference `<QRCodeSVG value={\`${globalThis.location.origin}/\`} level="M" marginSize={QUIET_ZONE_MODULES} />` and asserts `expect(drawn).toEqual(readDrawing(reference ?? container));` (:58), which compares the `viewBox` and the modules path `d`. Probed: with `value={address.shown}` at VisitorQrCodeAction.tsx:39 this test fails (`× … draws a code that encodes …`, 2 failed / 2 passed). The source was restored afterwards | PASS |
| R02 | D14 (blocking): no test holds the four-module quiet zone | `6aa6f19` VisitorQrCodeAction.test.tsx:61-72, `it('leaves a quiet zone of four modules around the code')`. Assertions `expect(drawn.viewBox).toBe(\`0 0 ${paddedSize} ${paddedSize}\`);` (:70) with `paddedSize = moduleCount + 2 * QUIET_ZONE_MODULES`, and `expect(drawn.modules).toMatch(new RegExp(\`^M${QUIET_ZONE_MODULES} ${QUIET_ZONE_MODULES}h\`));` (:71). Probed: `const QUIET_ZONE_MODULES = 0;` in the component fails this test and R01's test. Deleting the `marginSize={QUIET_ZONE_MODULES}` line fails the same two. The source was restored after each probe | PASS |
| R03 | B08 (non-blocking): the Home invariant's `Held by:` lines name only one of its three halves | `6aa6f19` apps/pragma/site/src/routes/home/INVARIANTS.md:31-32 adds `Held by: \`site/src/routes/home/HomePage.test.tsx\` › shows no flame when the flames cannot be read, and the rest of Home still works` (exists at HomePage.test.tsx:267) and `Held by: \`site/src/components/organisms/visitor-qr-code.core.test.ts\` › encodes the concert sign-up page at the root and shows only the host` (exists at visitor-qr-code.core.test.ts:6). `scripts/check-vocabulary-paths.sh` exited 0 ("every Held by names a test that exists") | PASS |
| R04 | B25 (non-blocking): test titles name no condition, or promise what the body does not assert | `6aa6f19` VisitorQrCodeAction.test.tsx:74 `it('closes the sheet when Close is pressed')`. :32 drops "with a quiet zone" from the first title, so it reads `it('opens a sheet with the code, dark on white, and the host under it')`. The quiet zone now has its own test (R02) | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware apps/pragma/site/src/components/organisms/VisitorQrCodeAction.test.tsx` | exit 0, no diagnostics | PASS |
| B02 | Type assertions only `as const` / `as unknown`, no `any`, no `useEffect` | `grep -nP '\bany\b\|\bas (?!const\|unknown)\|useEffect\('` on the changed test | none found (grep exit 1). The SVG type is narrowed with `if (!(code instanceof SVGElement)) { throw new TypeError(…) }` at :15-17, not an assertion | PASS |
| B03 | `noUncheckedIndexedAccess` honoured | read in full | `const [, modules] = [...code.querySelectorAll('path')];` then `modules?.getAttribute('d') ?? null` (:22-23). `Number(edgeToEdge.viewBox?.split(' ')[2])` gives `NaN` on a missing entry, which `expect(moduleCount).toBeGreaterThan(0)` (:69) rejects | PASS |
| B04 | Names carry intent | read in full | `openCode`, `readDrawing`, `drawn`, `reference`, `edgeToEdge`, `moduleCount`, `paddedSize`. No abbreviation or single-letter local | PASS |
| B05 | Standards 01: an invariant promising behaviour carries a `Held by:` line, and its rule is still true | apps/pragma/site/src/routes/home/INVARIANTS.md read in full | The rule at :21-23 is unchanged and still matches HomePage.tsx:204. Each of its three halves now names a test (R03) | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed $(git rev-parse d23d988ee9ba409cdf71fb4d3664e69e31a08501) --coverage --reporter=verbose` | 0. 1 file, 4 tests, all passing: `VisitorQrCodeAction.test.tsx` › `opens a sheet with the code, dark on white, and the host under it`, `draws a code that encodes the sign-up page at the root of the current origin`, `leaves a quiet zone of four modules around the code`, `closes the sheet when Close is pressed`. The coverage table is empty (0/0) because only a test file changed | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed $(git rev-parse d23d988…) --reporter=verbose` | 0. No back-e2e file selected. No file under `api/`, `domain/` or `test/` changed since round 1 | PASS |
| C03 | @borso-app/pragma | `scripts/check-vocabulary-paths.sh`, the gate that reads `Held by:` lines | 0 | PASS |
| C04 | @borso-app/pragma | mutation and lockfile runs | Not run. `git diff d23d988..HEAD --name-only` with the `.core`, `.utils` and `.adapter` globs, `pnpm-lock.yaml` and `pnpm-workspace.yaml` printed `0`. Round 1's C03 and C04 still apply to the unchanged source | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | UC4: the code drawn on screen encodes `<origin>/` | `it('draws a code that encodes the sign-up page at the root of the current origin')` at apps/pragma/site/src/components/organisms/VisitorQrCodeAction.test.tsx:46. Assertion `expect(drawn).toEqual(readDrawing(reference ?? container));` at :58. A mutation probe showed it fails (R01) | PASS |
| D02 | UC5: a quiet zone of at least four modules | `it('leaves a quiet zone of four modules around the code')` at VisitorQrCodeAction.test.tsx:61. Assertions at :70 (`viewBox` equals the module count plus 8) and :71 (the modules path starts at `M4 4h`). Two mutation probes showed it fails (R02) | PASS |

Round 1's other D rows read code and tests this round left unchanged (D01 to D10, D12, D13, D15 of the round-1 report), apart from the title change in R04.

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Write paths, check-then-write, per-process state | `git diff d23d988..HEAD --name-only` lists no `*.service.ts`, `*.repository.ts` or `*.controller.ts`, and no file under `api/`. The only changed code file is a test | PASS |

## Blocking findings

- None.

## Non-blocking findings

- None new. Round 1's A00 (plan absent, Tier 1) stands as recorded and needs no fix.

## Notes

- A probe set `level="L"` at VisitorQrCodeAction.tsx:40, and all four tests still passed. The spec and the ADR name no error-correction level, so this is no finding. `qrcode.react` 4.2.0 defaults `boostLevel` to true (lib/index.js:897), which may raise a short URL's level to the same code. Should the spec name the level, if the operator cares about scanning a phone screen through glare?
- Round 1's note on `// @FollowsBlueprint organism-presentational` for a component that owns `useState` is still open. No source file changed, so this round raises nothing new on it.
- Every probe edited `VisitorQrCodeAction.tsx` in place from a backup in the scratchpad, ran the one test file and restored it. `git status --short` printed nothing afterwards, and HEAD stayed at `6aa6f19`.

## Verdict: PASS
