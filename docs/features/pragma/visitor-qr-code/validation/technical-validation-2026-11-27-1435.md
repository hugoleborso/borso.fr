# Technical validation — Visitor QR code

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none (Tier 1). [ADR-2026-11-27T1426](../../../../adr/2026-11-27T1426-qr-code-library-for-visitor-qr.md) stands beside the spec, and its *Decision* and *Consequences* are checked as A rows.
- Branch: claude/amazing-cannon-2sikty
- Base: ac0e4d8b3795f824bf4763200bc5b4c1912b0d27
- Run at: 2026-11-27T14:42:54Z
- Round: 1
- Reviewed: d23d988ee9ba409cdf71fb4d3664e69e31a08501
- Touched workspaces: @borso-app/pragma (site only)

HEAD stayed at the reviewed SHA through every lint, test and mutation run. No merge commit sits above the base (`git rev-list --merges` printed nothing). The spec is in short form, with *Use cases*, *Rules* and *Out of scope* and no *Test strategy*, so categories A and D are built from its six use cases and three rules, walked in order. The three *Out of scope* bullets are deferrals and get no row. The diff adds and changes no API route, so the walk for unauthenticated response fields has nothing to read.

4 use-case claims are routed to /visual-validation and are out of scope for this report. They are the button sitting next to the streak chip (UC1), the code being "large" (UC3), the address sitting under the code (UC3), and the width at 375 px and the cap on a computer (UC5).

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | `docs/features/pragma/visitor-qr-code/` holds `spec/` and `validation/` only | UNVERIFIABLE (non-blocking) |
| A01 | UC1 | Button in the `/app` header actions, beside the streak chip | apps/pragma/site/src/routes/home/HomePage.tsx:190-205 | `actions={ <> {streaks === undefined ? null : ( <FlameChip … /> )} <VisitorQrCodeAction /> </> }` | PASS |
| A02 | UC1 | Shown whether or not a concert is ahead | apps/pragma/site/src/routes/home/HomePage.tsx:204 | `<VisitorQrCodeAction />` sits outside every branch of the fragment. Nothing reads `sessionsQuery` or `streaks` | PASS |
| A03 | UC2 | The concert's "Page publique" tab shows the button at the top | apps/pragma/site/src/components/organisms/ConcertPublicPagePanel.tsx:166-167 | `<div className="flex flex-col gap-4">` / `<VisitorQrCodeAction className="self-start" />` as the first child | PASS |
| A04 | UC2 | A practice has no such tab and no button | apps/pragma/site/src/components/organisms/SessionDetail.tsx:247; apps/pragma/site/src/routes/sessions/session-page.core.ts:217 | `public: isConcert ? <ConcertPublicPagePanel sessionId={session.id} /> : null,` / `return input.isConcert ? [...withDetails, 'public'] : withDetails;`. `grep -rn VisitorQrCodeAction` finds only these two hosts | PASS |
| A05 | UC3 | Opens the existing `Sheet`, titled "QR code visiteur" | apps/pragma/site/src/components/organisms/VisitorQrCodeAction.tsx:22,35; fr.json | `const title = t('visitorQr.title');` / `<Sheet title={title} label={title} onClose={() => setIsOpen(false)}>`; fr.json `"title": "QR code visiteur"` | PASS |
| A06 | UC3 | The address under the code, in the mono font, for example `pragma.borso.fr` | VisitorQrCodeAction.tsx:51-53; visitor-qr-code.core.ts:12 | `<figcaption className="font-mono text-body break-all text-ink">{address.shown}</figcaption>` / `shown: new URL(origin).host` | PASS |
| A07 | UC3 | A close control closes it | VisitorQrCodeAction.tsx:35 | `onClose={() => setIsOpen(false)}` on the shared `Sheet` | PASS |
| A08 | UC4 | Encodes `<page origin>/`, so a preview encodes its own address | VisitorQrCodeAction.tsx:23,39; visitor-qr-code.core.ts:3,12 | `buildVisitorQrCodeAddress(globalThis.location.origin)` / `value={address.encoded}` / `const SIGN_UP_PAGE_PATH = '/';` / `` encoded: `${origin}${SIGN_UP_PAGE_PATH}` `` | PASS |
| A09 | UC5 | Dark modules on white, the same in both themes | VisitorQrCodeAction.tsx:11-12,43-44 | `const LIGHT_MODULE_COLOUR = '#ffffff';` / `const DARK_MODULE_COLOUR = '#000000';` / `bgColor={LIGHT_MODULE_COLOUR}` / `fgColor={DARK_MODULE_COLOUR}`. Literal hex values, no theme token | PASS |
| A10 | UC5 | A quiet zone of at least four modules | VisitorQrCodeAction.tsx:10,42 | `const QUIET_ZONE_MODULES = 4;` / `marginSize={QUIET_ZONE_MODULES}`. The library default is `DEFAULT_MARGIN_SIZE = 0` (qrcode.react lib/index.js:813), so the prop is load-bearing | PASS |
| A11 | UC5 | As wide as the sheet allows, capped on a computer | VisitorQrCodeAction.tsx:37,47 | `<div className="w-full max-w-80 overflow-hidden rounded-lg">` / `className="block h-auto w-full"`. The rendered size is routed to /visual-validation | PASS |
| A12 | UC6, ADR Decision | Drawn with no network request, by `qrcode.react` 4.2.0 through `QRCodeSVG` | apps/pragma/package.json:69; VisitorQrCodeAction.tsx:3,38 | `"qrcode.react": "4.2.0",` / `import { QRCodeSVG } from 'qrcode.react';`. `grep -n "fetch\|XMLHttp"` on the library's `lib/index.js` finds nothing | PASS |
| A13 | ADR Consequences `~` | "Only the sheet that shows the code imports it" | VisitorQrCodeAction.tsx:3 | `grep -rn qrcode.react apps/ --include=*.ts --include=*.tsx` finds this one import | PASS |
| A14 | ADR Consequences `+` | Drawn from the page's own origin | VisitorQrCodeAction.tsx:23 | `buildVisitorQrCodeAddress(globalThis.location.origin)` | PASS |
| A15 | Rules | Every visible string is in `en.json` and `fr.json`, with "Visitor QR code" in English | en.json:1167-1169; fr.json:1167-1169 | `"title": "Visitor QR code", "codeLabel": "QR code to the concert sign-up page"` / `"title": "QR code visiteur", "codeLabel": "QR code vers la page d’inscription au concert"`. The `i18n-parity.core.test.ts` parity tests passed in C01 | PASS |
| A16 | Rules | No API, schema or route change | diff | `git diff <base>...HEAD --name-only -- apps/pragma/api apps/pragma/domain apps/pragma/test \| wc -l` printed `0`. No router file changed | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <8 changed .ts/.tsx files>` | exit 0, no diagnostics | PASS |
| B02 | knip | `pnpm exec knip --workspace apps/pragma` | exit 0. Only a configuration hint about `.css` | PASS |
| B03 | Names carry intent, no abbreviations or single-letter locals | read in full | `address`, `title`, `isOpen`, `background`, `modules`, `caption`, `firstButton`. None found | PASS |
| B04 | Magic numbers and strings are named constants | read in full | `QUIET_ZONE_MODULES`, `LIGHT_MODULE_COLOUR`, `DARK_MODULE_COLOUR`, `SIGN_UP_PAGE_PATH`. `level="M"` is the library's own error-correction enum | PASS |
| B05 | Type assertions only `as const` / `as unknown`, no `any` | `grep -nP '\bany\b\|\bas (?!const\|unknown)'` on changed files | Only hits are `Button as PressableButton` (an import alias, ConcertPublicPagePanel.tsx:6) and test titles ("as its one primary action") | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read in full | `const [background, modules] = [...]` then `background?.getAttribute` (VisitorQrCodeAction.test.tsx:21-23); `const [firstButton] = …` then `firstButton?.textContent` (ConcertPublicPagePanel.test.tsx:102-103) | PASS |
| B07 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B08 | Standards 01: "an invariant promising behaviour carries a `Held by:` line" | read INVARIANTS.md in full | `- The header always offers the visitor QR code, which leads to the concert sign-up page at \`/\`, whether or not a session is ahead and whether or not the flames could be read.` at apps/pragma/site/src/routes/home/INVARIANTS.md:21-23. The only new `Held by:` names `HomePage.test.tsx › offers the visitor QR code in the header even with no session ahead`. The flames half is held by `HomePage.test.tsx › shows no flame when the flames cannot be read, and the rest of Home still works` (HomePage.test.tsx:267, which now asserts the button). The `/` half is held by `visitor-qr-code.core.test.ts › encodes the concert sign-up page at the root and shows only the host`. Neither is listed. Introduced: this branch; Fix size: two lines | FAIL (non-blocking) |
| B09 | Standards 01: a definition in `VOCABULARY.md` and a rule in `INVARIANTS.md` are still true | read in full | The new invariant matches HomePage.tsx:204 (unconditional render) and visitor-qr-code.core.ts:3 (`'/'`) | PASS |
| B10 | Standards 01: `build…` returns what its verb says | read in full | `export function buildVisitorQrCodeAddress(origin: string): VisitorQrCodeAddress` builds and returns a new value (visitor-qr-code.core.ts:11-13) | PASS |
| B11 | Standards 01: booleans not negated; comments say what code cannot | read in full | `isOpen`. The only comments are the `@Feature` and `@FollowsBlueprint` markers | PASS |
| B12 | Standards 01: file name says what the file holds | read in full | `visitor-qr-code.core.ts` holds the visitor QR address rule. `VisitorQrCodeAction.tsx` holds the button and its sheet | PASS |
| B13 | Standards 02: `.core.ts` vs `.utils.ts` | read in full | "visitor" and the **concert sign-up page** are app terms (apps/pragma/VOCABULARY.md:205), so `.core.ts` fits | PASS |
| B14 | Standards 02: a site rule does not restate an API rule | read in full | No API rule touches the sign-up address | PASS |
| B15 | Standards 03: derived types derived, untrusted input parsed | read in full | `VisitorQrCodeAddress` mirrors no row, body or response. `location.origin` is not untrusted input | PASS |
| B16 | Standards 04 and 11: repository shape, multi-table transactions, rate limits | diff | No `api/` file changed | PASS |
| B17 | Standards 05: a route composes organisms and owns no layout primitive | HomePage.tsx read in full | The change adds a React fragment and an organism in `actions`. It adds no `div` and no layout class | PASS |
| B18 | Standards 05: no new label explains the interface | read in full | The button label is "Visitor QR code" / "QR code visiteur", a short label beside the `userPlus` icon | PASS |
| B19 | Standards 05: every screen holds together at 375 px, and no fold-stacking where tabs belong | needs `agent-browser` and `scripts/phone.sh` | The header's actions now hold the flame chip and a labelled secondary button. The public tab gains one button above its first card | routed to /visual-validation |
| B20 | Standards 05: no family of booleans; no write on `pointerdown` | read in full | The only prop is `className?: string`. No pointer handler | PASS |
| B21 | Standards 06: mutation reconciles from response; forms go through `useForm` | read in full | No mutation and no form. `useState(false)` holds the sheet's open flag | PASS |
| B22 | Standards 07 and 12: reasons on effects and disable comments | `grep -n "eslint-disable\|useEffect"` on changed files | none found | PASS |
| B23 | Standards 08: more than two variants go through `cva`; a new effect reuses what the screen renders | read in full | No variant set. The sheet reuses `Sheet` and `Button` | PASS |
| B24 | Standards 09: a key's dotted path names the screen and the element | en.json:1167-1169 | `visitorQr.title`, `visitorQr.codeLabel` (the sheet, then its title and the code's label) | PASS |
| B25 | Standards 10: a test name states the behaviour and the condition | read in full | `it('closes the sheet', …)` at VisitorQrCodeAction.test.tsx:28 names no condition (pressing Close). `it('opens a sheet with the code, dark on white with a quiet zone, and the host under it', …)` at VisitorQrCodeAction.test.tsx:14 claims a quiet zone and a position that no assertion in its body checks. Introduced: this branch; Fix size: one file | FAIL (non-blocking) |
| B26 | Standards 14: pre-commit checks | diff | No `.husky/` change | PASS |
| B27 | Standards 00: hotspots and temporal coupling | — | These guide which pattern to write down next. No finding applies to this diff | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed $(git rev-parse ac0e4d8…) --coverage --reporter=verbose` | 0. 82 files, 505 tests. These include `VisitorQrCodeAction.test.tsx` (2 tests), `visitor-qr-code.core.test.ts` (2), `ConcertPublicPagePanel.test.tsx › opens the visitor QR code from the top of the tab` and `HomePage.test.tsx › offers the visitor QR code in the header even with no session ahead`. Coverage of `visitor-qr-code.core.ts` is 100/100/100/100 | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed $(git rev-parse ac0e4d8…) --reporter=verbose` | 0. "No test files found". The diff touches no file under `api/`, `domain/` or `test/` (count 0), so no back-e2e file imports a changed module | PASS |
| C03 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core`, because `pnpm-lock.yaml` changed (it adds `qrcode.react@4.2.0`) | 0. 495 files, 4752 tests | PASS |
| C04 | @borso-app/pragma | `scripts/mutate-changed.sh $(git rev-parse ac0e4d8…) apps/pragma` | 0. `visitor-qr-code.core.ts`: 3 killed, 0 survived, score 100.00 | PASS |
| C05 | @borso-app/pragma | every `*.utils.ts` has a sibling `*.utils.test.ts` | loop over `git ls-files 'apps/pragma/**/*.utils.ts'` printed no `MISSING` | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | UC1: the button is in the header of `/app` | `it('shows no flame when the flames cannot be read, and the rest of Home still works')` at apps/pragma/site/src/routes/home/HomePage.test.tsx:267. Assertion `within(screen.getByRole('banner')).getByRole('button', { name: 'Visitor QR code' })` at :276-278 | PASS |
| D02 | UC1: shown with no concert ahead | `it('offers the visitor QR code in the header even with no session ahead')` at HomePage.test.tsx:281, with `answerHomeApi([])`. Assertion `within(sheet).getByText(globalThis.location.host)` at :291 after clicking the banner button | PASS |
| D03 | UC1: shown with a session ahead | HomePage.test.tsx:268 sets up `answerHomeApi([NEXT_PRACTICE], 403)` and asserts the banner button at :276-278. **structural:** HomePage.tsx:204 renders it outside every session branch, so a concert ahead takes the same path | PASS |
| D04 | UC2: the concert's public tab shows the button at its top | `it('opens the visitor QR code from the top of the tab')` at apps/pragma/site/src/components/organisms/ConcertPublicPagePanel.test.tsx:100. Assertion `expect(firstButton?.textContent).toBe('Visitor QR code');` at :103 | PASS |
| D05 | UC2: a practice has no public tab, so no button | `it('adds the public page view to a concert only, after its details')` at apps/pragma/site/src/routes/sessions/session-page.core.test.ts:54. Assertion `readSessionView('public', listSessionViews({ isConcert: false, isPractice: true, … }))` `.toBe('songs')` at :62-67. The button lives only inside `ConcertPublicPagePanel` | PASS |
| D06 | UC3: the button opens a sheet titled with the visitor QR title | `it('opens a sheet with the code, …')` at apps/pragma/site/src/components/organisms/VisitorQrCodeAction.test.tsx:14. Assertions `expect(screen.queryByRole('dialog')).toBeNull();` at :16, then `screen.getByRole('dialog', { name: 'Visitor QR code' })` at :18 | PASS |
| D07 | UC3: the sheet holds the code | VisitorQrCodeAction.test.tsx:19-20. Assertions `within(sheet).getByRole('img', { name: CODE_LABEL })` and `expect(code.tagName.toLowerCase()).toBe('svg');` | PASS |
| D08 | UC3: the address is shown in the mono font | VisitorQrCodeAction.test.tsx:24-25. Assertions `within(sheet).getByText(globalThis.location.host)` and `expect(caption.className).toContain('font-mono');` | PASS |
| D09 | UC3: the close control closes the sheet | `it('closes the sheet')` at VisitorQrCodeAction.test.tsx:28. Assertion `expect(screen.queryByRole('dialog')).toBeNull();` at :32 | PASS |
| D10 | UC4: the address is `<origin>/` and shows the host | `it('encodes the concert sign-up page at the root and shows only the host')` at apps/pragma/site/src/components/organisms/visitor-qr-code.core.test.ts:6. Assertion `toEqual({ encoded: 'https://pragma.borso.fr/', shown: 'pragma.borso.fr' })` at :7-10 | PASS |
| D11 | UC4: **the code drawn on screen encodes** `<origin>/` | (none found). No test reads what the rendered `<svg>` encodes. Change VisitorQrCodeAction.tsx:39 from `value={address.encoded}` to `value={address.shown}` and the four feature tests still pass (inferred from reading every assertion in VisitorQrCodeAction.test.tsx, ConcertPublicPagePanel.test.tsx:100-106 and HomePage.test.tsx:276-291, which read only fills, labels, roles and the caption; not probed, because this review modifies no source file). A phone would then scan the bare text `pragma.borso.fr`, which is not a link. Fix: render `<QRCodeSVG value={\`${location.origin}/\`} level="M" marginSize={4} />` in the test and compare the modules path's `d` attribute, or decode the SVG | FAIL (blocking) |
| D12 | UC4: a preview encodes its own address | `it('keeps the port of a local or preview origin in both')` at visitor-qr-code.core.test.ts:13. Assertion `toEqual({ encoded: 'http://localhost:5173/', shown: 'localhost:5173' })` at :14-17. **structural:** VisitorQrCodeAction.tsx:23 passes `globalThis.location.origin` | PASS |
| D13 | UC5: dark modules on a white square, in both themes | VisitorQrCodeAction.test.tsx:21-23. Assertions `expect(background?.getAttribute('fill')).toBe('#ffffff');` and `expect(modules?.getAttribute('fill')).toBe('#000000');`. Literal colours are theme-independent | PASS |
| D14 | UC5: a quiet zone of at least four modules | (none found). The test title says "with a quiet zone", but no assertion reads `viewBox` or the path offset. `qrcode.react`'s default margin is 0 (lib/index.js:813). Delete `marginSize={QUIET_ZONE_MODULES}` at VisitorQrCodeAction.tsx:42, or set the constant to 0, and every test still passes (inferred the same way, not probed) while the code runs edge to edge inside a `rounded-lg overflow-hidden` box that clips its finder corners. Fix: assert that the module path's `d` starts at `M4` (or that `viewBox` is the module count plus 8) | FAIL (blocking) |
| D15 | UC6: no network request | **structural:** `QRCodeSVG` encodes in-process. `grep -n "fetch\|XMLHttp"` on `node_modules/.pnpm/qrcode.react@4.2.0_react@19.3.1/node_modules/qrcode.react/lib/index.js` finds nothing, and VisitorQrCodeAction.tsx makes no request | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Write paths, check-then-write, per-process state | `git diff <base>...HEAD --name-only -- '*.service.ts' '*.repository.ts' '*.controller.ts' \| wc -l` printed `0`. `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed files found nothing. The only state is the component-local `useState(false)` at VisitorQrCodeAction.tsx:21 | PASS |

## Blocking findings

- D11: no test checks what the drawn code encodes. Swapping `value={address.encoded}` for `address.shown` at VisitorQrCodeAction.tsx:39 passes every test and ships a code that is not a link.
- D14: no test holds the four-module quiet zone. Dropping `marginSize` at VisitorQrCodeAction.tsx:42 falls back to the library's default of 0 and passes every test.

## Non-blocking findings

- A00: the plan is absent (Tier 1). Files were taken from the diff.
- B08: the new Home invariant (INVARIANTS.md:21-23) promises three things, and its `Held by:` lines name the test for only one of them. The flames test (HomePage.test.tsx:267) and the `/` test (visitor-qr-code.core.test.ts:6) are missing.
- B25: `it('closes the sheet')` names no condition. The other test's title promises a quiet zone and a position that it never asserts.

## Notes

- A00 is UNVERIFIABLE only because no plan exists. The ADR's implementation pointers say "Plan: none, Tier 1 after the spec".
- `VisitorQrCodeAction.tsx:18` carries `// @FollowsBlueprint organism-presentational`, whose index row says "owns no state and fetches nothing". The component holds `useState(false)` and reads `globalThis.location.origin` in render. No organism blueprint fits a button that owns its sheet's open flag. Should one be recorded, or should the marker name a different blueprint? No reviewer bullet covers this, so it is a note, not a row.
- `QRCodeSVG` gets both `title` and `aria-label` with the same string (VisitorQrCodeAction.tsx:45-47). Does a screen reader announce it twice? That is for /visual-validation or an accessibility pass to decide.
- B19 and the four routed use-case claims need `agent-browser` at 375 px and on a computer. They are /visual-validation's.

## Verdict: FAIL
