# Technical validation — Setlists get their own tab, and a take goes up to 200 MiB

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (`docs/features/pragma/setlists-tab-and-bigger-takes/plan/` does not exist)
- Branch: claude/brave-newton-rzu3qy
- Base: origin/main
- Run at: 2026-11-13T09:13:11Z
- Round: 2
- Reviewed: 5d9dfa09cd161aa33e6c2f4064fea597c1376ace
- Touched workspaces: @borso-app/pragma (site)

Round 2 reads `git diff df671784d662d83b240d2133c40a1178b810ab1f..HEAD`, one commit (`5d9dfa09`). It changes `apps/pragma/site/src/routes/setlists/SetlistsPage.tsx` (one line), adds `apps/pragma/site/src/routes/setlists/SetlistsPage.test.tsx`, and commits the round-1 report. No new scope, and no merge of `main` sits above the reviewed SHA. The commit message records D05 and B11 as fixed and A01 as dismissed, so each gets a row below. 0 use cases routed to /visual-validation in this round (round 1 routed 1).

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A15 | Behaviour 3 | The Setlists page is still titled "Setlists" after the key change | apps/pragma/site/src/routes/setlists/SetlistsPage.tsx:53; en.json:595 | `<PageHeader title={t('setlist.title')} />`; `setlist.title` reads `Setlists` in both en.json and fr.json (read with `json.load`) | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | D05 (blocking): no test pins the Setlists page title | `5d9dfa09` apps/pragma/site/src/routes/setlists/SetlistsPage.test.tsx:46-47, `it('is titled Setlists, the name of the tab that opens it'` / `expect(container.querySelector('h1')?.textContent).toBe('Setlists');`. PageHeader renders the title in `<h1 className={TITLE_CLASS}>{title}</h1>` (PageHeader.tsx:59). The round-1 failing case, reverting to `t('sessions.title')`, renders "Sessions" in both catalogues (fr `sessions.title` is `Sessions`), so this assertion fails on it. | PASS |
| R02 | D06 (round 1 graded structural, the fix adds a test) | SetlistsPage.test.tsx:50-51, `it('shows no Sessions or Setlists toggle, since the tab bar does that job'` / `expect(container.querySelector('[role=tablist]')).toBeNull();`. The removed toggle rendered `SectionTabs`, built on react-aria `TabList` (SectionTabs.tsx:2 at origin/main), which SectionTabs.test.tsx:18 finds with `getByRole('tablist', …)`, so the selector would match it. | PASS |
| R03 | B11 (non-blocking): page titled with the navigation key | `5d9dfa09` SetlistsPage.tsx:53 `<PageHeader title={t('setlist.title')} />` | PASS |
| R04 | A01 (non-blocking) dismissed: "the change is one constant and one tab entry, and no row of the report depends on a plan" | Checked. `grep -c UNVERIFIABLE` on the round-1 report prints `0`, and no row there cites the plan, so the load-bearing half holds. The size half understates the diff (it also deletes `SessionsSectionTabs.tsx` and its i18n keys and edits two pages, 15 files under `apps/` by `git diff --stat`), but that does not make a plan necessary for any row. | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B17 | No abbreviations / 1-letter locals | read the diff | New names `container`, `root`; none found | PASS |
| B18 | No prose comments | read the diff | Only `// @FollowsBlueprint test-component-render` (SetlistsPage.test.tsx:22), a machine-read marker | PASS |
| B19 | Type assertions / `any` | `grep -nE ' as [A-Z]'`, `grep -nP '\bany\b'` on both files | none found | PASS |
| B20 | `useEffect` smell | `grep -nE '\buseEffect\('` on both files | none found | PASS |
| B21 | Lint clean | `pnpm exec oxlint --type-aware apps/pragma/site/src/routes/setlists/SetlistsPage.tsx apps/pragma/site/src/routes/setlists/SetlistsPage.test.tsx` | exit 0, no output | PASS |
| B22 | Typecheck and unused exports | `pnpm --filter @borso-app/pragma run typecheck`; `pnpm knip --workspace apps/pragma` | exit 0; exit 0 with the same 3 configuration hints as round 1 | PASS |
| B23 | Standards checklist (09-i18n): "a key's dotted path names the screen and the element" | SetlistsPage.tsx read in full | `t('setlist.title')` at :53 names the setlists screen's title | PASS |
| B24 | Standards checklist (10-testing): "a test name states the behaviour and the condition" | SetlistsPage.test.tsx read in full | `'is titled Setlists, the name of the tab that opens it'`, `'shows no Sessions or Setlists toggle, since the tab bar does that job'` | PASS |
| B25 | Standards checklist (05-frontend): route composes organisms, no new subtitle or hint | SetlistsPage.tsx read in full | Only the title key changed; no element added | PASS |
| B26 | Blueprint `test-component-render` followed | SetlistsPage.test.tsx read against blueprint-index.md:274 | Mounts with `createRoot` inside `act` (:31-38), imports the app's `i18next` from `../../i18n/i18n.setup` (:5), fresh container and root per case (:27-44) | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C05 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed df671784d662d83b240d2133c40a1178b810ab1f --coverage --reporter=verbose` | 0. 2 files, 3 tests passed: both `SetlistsPage.test.tsx` cases and `App.test.tsx › the application shell › opens the vote page for a visitor with no session…`. No gated file changed, so the coverage table is empty. | PASS |
| C06 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma run test:e2e --changed df671784d662d83b240d2133c40a1178b810ab1f --reporter=verbose` | 0, "No test files found". Expected: the round-2 diff touches only a site route, which no API test imports. | PASS |
| C07 | @borso-app/pragma (mutation) | `scripts/mutate-changed.sh` not run | The round-2 diff changes no `.core`, `.utils` or `.adapter` module or its test | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D14 | Behaviour 3: the Setlists page is titled "Setlists" (round-1 D05) | `it('is titled Setlists, the name of the tab that opens it'` at apps/pragma/site/src/routes/setlists/SetlistsPage.test.tsx:46; assertion :47 `expect(container.querySelector('h1')?.textContent).toBe('Setlists');` | PASS |
| D15 | Behaviour 3: the Setlists page shows no Sessions/Setlists toggle (round-1 D06) | `it('shows no Sessions or Setlists toggle, since the tab bar does that job'` at SetlistsPage.test.tsx:50; assertion :51 `expect(container.querySelector('[role=tablist]')).toBeNull();` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E03 | Write paths and module-level state | Check-then-write, per-process state | The round-2 diff touches no `.service.ts`, `.repository.ts` or `.controller.ts` (`git diff --name-status df671784..HEAD` lists one route, its test and a report), and adds no module-level `let` or `new Map`/`new Set` | PASS |

## Blocking findings

- none

## Non-blocking findings

- none new in this round

## Notes

- The round-1 note on the 5-minute presigned upload URL (`UPLOAD_URL_EXPIRES_MINUTES = 5`, apps/pragma/api/src/uploads/uploads.types.ts:16) against a now four times larger take is still unanswered. Does S3 refuse a PUT whose body is still streaming when the URL expires? Not probed here.
- The A01 dismissal says the change is "one constant and one tab entry". The branch also removes the Sessions/Setlists toggle. The PR description should not repeat the narrower wording.

## Verdict: PASS
