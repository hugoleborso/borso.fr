# Technical validation — Song takes and push: install banner (amendment of 2026-10-24)

- Spec: [`../spec/spec.md`](../spec/spec.md) — scope limited to the "Install banner" paragraph under *Result*, the two install-banner edge cases, the Q.O.D. row "How to explain installing the app?" and the *Install banner* Test strategy bullet. The rest of the spec was validated earlier.
- Plan: [`../plan/plan.md`](../plan/plan.md) — has no install-banner section (see Notes).
- Branch: claude/pragma-takes-and-push
- Base: bbe8da1d (diff `bbe8da1d...92360fb6`, commits 28f5433c and 92360fb6)
- Run at: 2026-10-24T02:21:34Z
- Touched workspaces: @borso-app/pragma (site only; no `api/` file changed), `scripts/architecture` (manifest)

3 use cases routed to /visual-validation; out of scope for this report: the walkthrough matching each of the iPhone Safari, iPhone Chrome and Android Chrome user agents at 375 px; the banner absent at 1280 px desktop and under `display-mode: standalone` emulation; the banner staying dismissed after a reload.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Result, Install banner | "a dismissible banner sits at the top of every signed-in page" | apps/pragma/site/src/components/organisms/AppShell.tsx:187-189 | `<OfflineBanner isVisible={!isOnline} />` / `<InstallOffer />` / `<Outlet />` inside `<main>`; AppShell is mounted under `<RequireSession />` (App.tsx:39-42) | PASS (see Notes on the two scene routes) |
| A02 | Result, Install banner | Banner text, "Show me" and "×" | apps/pragma/site/src/components/molecules/InstallBanner.tsx:21-31; i18n/en.json `install.banner` | `<span className="flex-1 min-w-0">{t('install.banner')}</span>` … `{t('install.showMe')}` … `aria-label={t('install.dismiss')}` with `<Icon name="close" …/>`; en: `"banner": "Install pragma as an app, for notifications and full screen"` | PASS |
| A03 | Result, Install banner | "Show me" opens a sheet | apps/pragma/site/src/components/organisms/InstallOffer.tsx:52-56 | `onShowWalkthrough={() => setIsWalkthroughOpen(true)}` … `{isWalkthroughOpen ? (<InstallWalkthroughSheet walkthrough={walkthrough} …` | PASS |
| A04 | Result; Q.O.D. "How to explain installing the app?" | Short looping walkthrough drawn in code, animated with CSS only | apps/pragma/site/src/components/organisms/InstallWalkthroughSheet.tsx:35-40, 75; styles/tokens.css:111-115; molecules/InstallPhoneScreen.tsx:233-244 | `animation: \`install-walkthrough-advance ${stepCount * SECONDS_PER_STEP}s steps(${stepCount}) infinite\``; `@keyframes install-walkthrough-advance { to { transform: translateX(-100%); } }`; screens are JSX + Tailwind, `aria-hidden="true"`. No JS timer, no `useEffect`. Reduced motion swaps to a static `<ol>` (`hidden motion-reduce:flex`) | PASS |
| A05 | Result, iOS Safari | Share → scroll → "Add to Home Screen" → Add | apps/pragma/site/src/lib/install-offer.utils.ts:29-34 | `const IOS_SAFARI_STEPS … = ['tap-share', 'scroll-share-sheet', 'tap-add-to-home-screen', 'confirm-add']` | PASS |
| A06 | Result, Android Chrome | ⋮ → "Install app" (or "Add to Home screen") → Install | install-offer.utils.ts:39; i18n/en.json `install.steps.tapInstallApp` | `android: ['tap-browser-menu', 'tap-install-app', 'confirm-install']`; `"tapInstallApp": "Tap “Install app” (or “Add to Home screen”)."` | PASS |
| A07 | Result, Android Chrome | When Chrome offered `beforeinstallprompt`, a real Install button opens Chrome's prompt | apps/pragma/site/src/lib/install-prompt.adapter.ts:64-71, 84-89; main.tsx:20; InstallOffer.tsx:31, 42-49, 56 | `target.addEventListener(BEFORE_INSTALL_PROMPT_EVENT, (event) => { if (!isDeferredInstallPrompt(event)) return; event.preventDefault(); publishInstallPrompt(event); });` / `captureInstallPrompt();` at module load / `onInstall={offeredPrompt === null ? null : () => void installWith(offeredPrompt)}` → `await installPrompt.prompt();` | PASS |
| A08 | Result | Steps captioned through i18n (fr, en) | i18n/en.json and i18n/fr.json, `install.*` (27 keys each, same shape); InstallWalkthroughSheet.tsx:21-30 | `'tap-share': 'install.steps.tapShare'` …; fr: `"tapShare": "Dans Safari, touchez Partager."` | PASS |
| A09 | Result | Never in the installed app, on a desktop browser, or after dismissal on that device | install-offer.utils.ts:42-56 | `if (device.isStandalone \|\| device.isDismissed) return null;` … `return userAgent.includes(ANDROID_MARKER) ? 'android' : null;` | PASS |
| A10 | Edge case 1 | Installed = `display-mode: standalone` or `navigator.standalone` on iOS | install-prompt.adapter.ts:91-99 → push-subscription.adapter.ts:75-76, 98 | `isStandalone: readInstallContext(environment).isStandalone`; `isHomeScreenApp: 'standalone' in navigator && navigator.standalone === true, matchesStandaloneDisplay: window.matchMedia(STANDALONE_DISPLAY_QUERY).matches`; `isStandalone: environment.isHomeScreenApp \|\| environment.matchesStandaloneDisplay` | PASS |
| A11 | Edge case 1 | Dismissal remembered in local storage; a refused write only means it comes back next time | install-prompt.adapter.ts:111-120; InstallOffer.tsx:37-40 | `readStorage().setItem(INSTALL_BANNER_DISMISSED_KEY, DISMISSED_VALUE); return true; } catch { return false; }`; `const dismiss = (): void => { didStoreInstallBannerDismissal(); setIsDismissed(true); };` | PASS |
| A12 | Edge case 2 | Non-Safari iOS browser gets the iOS walkthrough with a first step "open this page in Safari" | install-offer.utils.ts:27, 38, 47 | `IOS_OTHER_BROWSER_PATTERN = /CriOS\|FxiOS\|EdgiOS\|OPiOS\|GSA\/\|DuckDuckGo/`; `'ios-other-browser': ['open-in-safari', ...IOS_SAFARI_STEPS]` | PASS |
| A13 | Test strategy | Platform and installed-mode decision is a pure `install-offer.utils.ts`, reusing `isIosDevice` | install-offer.utils.ts:3, 46 | `import { isIosDevice } from '../components/organisms/notifications-offer.core';` … `if (isIosDevice(userAgent, maxTouchPoints)) {` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | Read of all 10 changed source files | Names sampled: `selectInstallWalkthrough`, `isNativeInstallOffered`, `didStoreInstallBannerDismissal`, `selectOfferedPrompt`, `animateWalkthrough`; only `_` is the unused `Array.from` element | PASS |
| B02 | Magic numbers / strings named | Read | `SECONDS_PER_STEP = 2.8`, `PERCENT_PER_SLIDE = 100`, `SHARE_SHEET_ROW_COUNT`, `MENU_ROW_COUNT`, `ANDROID_MARKER`, `BEFORE_INSTALL_PROMPT_EVENT`, `INSTALL_BANNER_DISMISSED_KEY`, `DISMISSED_VALUE` | PASS |
| B03 | No comments (machine-read annotations only) | `git diff bbe8da1d 92360fb6 \| grep -E '^\+.*(//\|/\*)'` minus annotations; `scripts/check-no-comments-in-styles-and-markup.sh` | Only `/**` openers of `@Feature`/`@DependsOnExternal` blocks; style script: "no stylesheet or page carries a comment" | PASS |
| B04 | Function names describe the result | Read | `installStepsOf`, `readInstallDevice`, `isInstallBannerDismissed`, `readDeferredInstallPrompt` | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` | `grep -nE ' as [A-Z]'` on changed .ts/.tsx | Only hits are prose inside manifest description strings (pragma.manifest.ts:196, 227); the event narrowing uses a type guard `event is Event & DeferredInstallPrompt` (install-prompt.adapter.ts:50) | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on changed .ts/.tsx | Only hit is the word "any" in a manifest description string (pragma.manifest.ts:196) | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | Read + `tsc --noEmit` | Lookups are on exhaustive `Record<InstallStep, …>` / `Record<InstallWalkthrough, …>` keyed by the union (`STEP_CAPTION_KEY[step]`, `SCREEN_BY_STEP[step]`, `STEPS_BY_WALKTHROUGH[walkthrough]`); no array index access | PASS |
| B08 | ESLint clean | `pnpm exec eslint --no-warn-ignored --max-warnings 0 <15 changed .ts/.tsx>` | exit 0 | PASS |
| B09 | Prettier clean | `pnpm exec prettier --check <18 changed .ts/.tsx/.json/.css>` | "All matched files use Prettier code style!", exit 0 | PASS |
| B10 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` (`tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit`) | exit 0 | PASS |
| B11 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed .ts/.tsx | none found; the deferred prompt goes through `useSyncExternalStore` (install-prompt.hook.ts:16-19) | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core project, includes `site/src/**/*.test.{ts,tsx}`, per-file 100% coverage on `site/src/**/*.utils.ts` and `*.adapter.ts`) | `pnpm run test:core` (from apps/pragma) | 0 — 251 files / 2541 tests passed; coverage 100% statements, branches, functions, lines | PASS |
| C02 | @borso-app/pragma, install files alone | `pnpm exec vitest run --project core site/src/lib/install-offer.utils.test.ts site/src/lib/install-prompt.adapter.test.ts site/src/components/organisms/InstallOffer.test.tsx` | 0 — 3 files / 32 tests | PASS |
| C03 | `*.utils.ts` sibling tests | Enumerate new `*.utils.ts` | `install-offer.utils.ts` → `install-offer.utils.test.ts` present and picked up (C02); `install-prompt.adapter.ts` → `install-prompt.adapter.test.ts` present | PASS |

The back-e2e project (`pnpm run test`) was not run: the diff touches no file under `api/`, `domain/` or `test/`.

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Edge 1: banner shows on a phone or tablet browser (iPhone, iPad posing as Mac, Android phone, Android tablet) | `it('offers the Safari walkthrough to Safari on an iPhone and on an iPad posing as a Mac')` install-offer.utils.test.ts:44 — `expect(selectInstallWalkthrough(deviceOf(IPAD_AS_MAC))).toBe('ios-safari')`; `it('offers the Android walkthrough to an Android phone and an Android tablet')` :63 — `expect(selectInstallWalkthrough(deviceOf(ANDROID_TABLET))).toBe('android')` | PASS |
| D02 | Edge 1: not on a desktop browser (decision half; the 1280 px render is visual-routed) | `it('offers nothing to a desktop browser, even with a touch screen')` install-offer.utils.test.ts:68 — `expect(selectInstallWalkthrough(deviceOf(DESKTOP_CHROME))).toBeNull()`; `it('offers nothing to a Mac without touch…')` :74 | PASS |
| D03 | Edge 1: not when running installed (decision half) | `it('offers nothing once pragma runs installed, on either platform')` install-offer.utils.test.ts:78 — `expect(selectInstallWalkthrough(deviceOf(IPHONE_SAFARI, { isStandalone: true }))).toBeNull()` | PASS |
| D04 | Edge 1: installed means `display-mode: standalone` or `navigator.standalone` | `it('reads either the iOS home screen flag or the standalone display mode as installed')` push-subscription.adapter.test.ts:168 — `readInstallContext({ ...BROWSER_TAB_ON_LINUX, isHomeScreenApp: true }).isStandalone` `.toBe(true)`; `it('reads the device from the display environment it is given')` install-prompt.adapter.test.ts:130 — `expect(readInstallDevice({ ...tab, matchesStandaloneDisplay: true }).isStandalone).toBe(true)` | PASS |
| D05 | Edge 1: dismissing is remembered on that device in local storage | `it('defaults to the browser local storage')` install-prompt.adapter.test.ts:168 — `expect(localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY)).toBe('dismissed')`; `it('hides once dismissed and stays hidden on the next visit')` InstallOffer.test.tsx:126 — remount, `expect(container.textContent).toBe('')` | PASS |
| D06 | Edge 1: a storage that refuses the write means the banner comes back next time | `it('treats a storage that refuses as never dismissed, so the banner comes back')` install-prompt.adapter.test.ts:175 — `expect(isInstallBannerDismissed(() => REFUSING_STORAGE)).toBe(false)`, `expect(didStoreInstallBannerDismissal(() => REFUSING_STORAGE)).toBe(false)`; :180 same with `window.localStorage` throwing | PASS |
| D07 | Edge 1: a refused write *only* has that consequence — tapping × still hides the banner for the current visit | (none found) — every `InstallOffer.test.tsx` case runs on a working jsdom `localStorage`; no test makes `setItem` throw and then taps "Hide this suggestion" | FAIL |
| D08 | Edge 2: an iOS browser other than Safari gets the iOS walkthrough… | `it('offers the open-in-Safari walkthrough to every other iOS browser')` install-offer.utils.test.ts:49 — `expect(selectInstallWalkthrough(deviceOf(userAgent))).toBe('ios-other-browser')` over CriOS, FxiOS, EdgiOS, OPiOS, GSA, DuckDuckGo | PASS |
| D09 | Edge 2: …whose first step is "open this page in Safari" | `it('starts another iOS browser with opening the page in Safari')` install-offer.utils.test.ts:99 — `expect(installStepsOf('ios-other-browser')).toEqual(['open-in-safari', 'tap-share', …])`; InstallOffer.test.tsx:109 — `toContain('open it in Safari')` | PASS |
| D10 | Result: Install button only when Chrome deferred its prompt, and it opens Chrome's own prompt | `it('offers Chrome its own prompt on Android once it was deferred, and hides after an install')` InstallOffer.test.tsx:138 — `expect(findButton('Install')).toBeNull()` before the event, `expect(deferred.prompt).toHaveBeenCalledTimes(1)` after; `isNativeInstallOffered` tests install-offer.utils.test.ts:119-127 | PASS |
| D11 | Test strategy: `install-offer.utils.ts` at 100% coverage | C01 — `thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 }` over `site/src/**/*.utils.ts`, run exit 0 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Database writes | Check-then-write | `git diff --name-status bbe8da1d 92360fb6` lists no `*.service.ts`, `*.repository.ts` or `*.controller.ts`; the diff is site-only and writes to no database | PASS |
| E02 | `installPromptStore` / `installPromptListeners` (install-prompt.adapter.ts:42-43) | Per-process state | `const installPromptStore: { current: DeferredInstallPrompt \| null } = { current: null }; const installPromptListeners = new Set<() => void>();` — module state in the browser tab, holding the one prompt Chrome gives that tab; the spec states no application-wide rule over it | PASS |
| E03 | `localStorage` key `pragma.installBannerDismissed` | Per-process state | The spec makes the dismissal per device ("remembered on that device"), which is exactly what browser storage is | PASS |

## Notes

- **D07 (FAIL).** The edge case says a refused write "only means the banner comes back next time", so dismissal must still hide the banner now. The code does that today (`InstallOffer.tsx:37-40` calls `setIsDismissed(true)` whatever `didStoreInstallBannerDismissal()` returns), but nothing pins it. Failing case a test should cover: on `ANDROID_CHROME`, `vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })`, render, click "Hide this suggestion" → expect `container.textContent` to be `''`. Without it, a change such as `if (didStoreInstallBannerDismissal()) setIsDismissed(true)` passes every current test and leaves Safari private-mode users unable to close the banner.
- **Plan and Changes not amended.** `plan/plan.md` has no install-banner step, and the spec's *Changes → Files to change* lists none of the 10 new or changed site files. The A rows were walked from the *Result* paragraph instead. Should `/technical-conception` and the spec's Changes block be brought up to date before ship?
- **Scene routes.** `/catalog/:songId/scene` and `/setlists/:setlistId/scene` are signed-in (under `RequireSession`, App.tsx:39-41) but sit outside `AppShell`, so they show no banner. Read literally, "every signed-in page" includes them. Leaving a banner off the full-screen stage view looks deliberate, but the spec does not say so. Should it list that exception?
- **Edge 2's premise.** The spec says only Safari can add to the home screen on iOS. Since iOS 16.4, Chrome, Edge and Firefox on iOS can add to the home screen from their own share menu. If that holds for the iOS versions the band uses, the `open-in-safari` step makes users of those browsers do an extra round trip. This is a question about the spec, not about the code, which does what the spec says.
- **Android browsers other than Chrome.** Any user agent with "Android" gets the Chrome walkthrough ("In Chrome, tap ⋮…"), including Firefox and Samsung Internet. The spec describes only Android Chrome. Should a non-Chrome Android browser get different copy?
- **Unhandled rejection on `prompt()`.** `installWith` (InstallOffer.tsx:43-49) runs as `void installWith(...)` with no `catch`. If Chrome's `prompt()` rejects, the walkthrough stays open and the rejection goes uncaught. A double tap cannot trigger this because the store clears synchronously and the button unmounts before a second tap, and I found no input that does. Is a `catch` that closes the sheet wanted?

## Verdict: FAIL
