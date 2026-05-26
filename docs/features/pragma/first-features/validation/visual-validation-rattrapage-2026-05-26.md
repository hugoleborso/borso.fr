# Visual-validation rattrapage — rounds 7 → 17c

Catch-up pass on visible/behavioural changes shipped on `claude/pragma-erp-specification-k41Mg` since round-6's clean baseline (`visual-validation-2026-05-20-1645.md`). Performed against the live preview `https://pragma-pr-26.preview.borso.fr/` at HEAD `4d9d5b7` on 2026-05-26. agent-browser 0.27.0, bundled chromium (Linux). Real-user flow: cookie-based login through the login form, no fetch patching.

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Live preview: https://pragma-pr-26.preview.borso.fr/
- Live API: https://pragma-pr-26-api.preview.borso.fr/
- Tooling: agent-browser 0.27.0

## A. New rows from rounds 7-17c

| # | Round | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | 9 | LanguageSwitcher pills (FR/EN) visible bottom-left of the AppShell | Load `/catalog`; snapshot shows two pills below the nav, above the Hugo chip | `./screenshots-rattrapage-2026-05-26/01-catalog-en.png` | PASS |
| 02 | 9 | Click FR re-renders the UI in French (Catalogue / Toutes / Prêtes scène / Répétées / En travail / Idées + "pas de partition") | Click FR pill, re-snapshot | `./screenshots-rattrapage-2026-05-26/02-catalog-fr.png` | PASS |
| 03 | 9 | Locale choice persists across reload (localStorage `pragma.locale`) | After FR click, reload; `<h1>` reads "Catalogue" | URL `/catalog`, h1 = "Catalogue", `localStorage['pragma.locale'] = 'fr'` | PASS |
| 04 | 9 | Click EN reverts; persists on reload | Click EN, reload; h1 reads "Catalog" | h1 = "Catalog" after reload | PASS |
| 05 | 10 | SPA fallback returns the app on direct deep-link to `/login` (no 404 JPEG) | Open `/login` in a fresh context; login form renders | `./screenshots-rattrapage-2026-05-26/00-login.png` | PASS |
| 06 | 10 | SPA fallback on `/catalog` deep link works once logged in | After auth, open `/catalog` directly; renders catalog with songs | `./screenshots-rattrapage-2026-05-26/01-catalog-en.png` | PASS |
| 07 | 10 | SPA fallback on `/sessions/<id>` deep link works | After auth, open `/sessions/cb57…/`; renders session detail | `./screenshots-rattrapage-2026-05-26/05-session-detail.png` | PASS |
| 08 | 10 | SPA fallback on `/sessions/<id>/setlist` deep link works | After auth, open `/sessions/cb57…/setlist`; expected setlist editor | `./screenshots-rattrapage-2026-05-26/04-deeplink-setlist.png` (blank app shell) | FAIL |
| 09 | 10 | API calls go to **same-origin** `/api/...` (no CORS preflights) | Reload `/catalog`, inspect network | Network: every API call goes to `pragma-pr-26-api.preview.borso.fr/api/...` cross-origin (CORS in play, `access-control-allow-origin` headers visible) | FAIL |
| 10 | 10 | `pas de partition` shows on a song without ChordPro in FR | Catalog FR pass — "If I Aint Got You" + "So What" both show "pas de partition" | `./screenshots-rattrapage-2026-05-26/02-catalog-fr.png` | PASS |
| 11 | 11 | MusicBrainz search returns ≥ 5 hits for "wonderwall oasis" with year + artist + title | Open `/catalog/new`, type "wonderwall oasis", wait | `./screenshots-rattrapage-2026-05-26/12-mb-search.png` — 10 hits shown | PASS |
| 12 | 11 + 15 | Search hits carry MB-enriched fields (year, album, duration `mm:ss`, disambiguation) | Snapshot of the hit list shows formats like `(2011 · Wonderwall (OASIS) · 3:34)`, `(2008-09-27: Rochester Auditorium, Rochester, NY, USA)`, `live, 2018-03-18: Live at Lollapalooza Festival, Chile` | `./screenshots-rattrapage-2026-05-26/12-mb-search.png` | PASS |
| 13 | 11 | Click a hit pre-fills title + artist | Click first hit (Sponsors); read input values via DOM | Title = "Wonderwall (OASIS)", Artist = "Sponsors" | PASS |
| 14 | 11 | Selecting PDF chart-kind reveals FileDrop with "Drop a file or click to pick · PDF, PNG, JPEG, WebP or HEIC up to 10 MB" | Click PDF radio | `./screenshots-rattrapage-2026-05-26/15-filedrop-pdf.png` | PASS |
| 15 | 11 + 12 | Upload a dummy PDF; post-upload state shows the S3 object key and a `Remove` button | `upload input[type=file] /tmp/dummy.pdf`; check innerText | `./screenshots-rattrapage-2026-05-26/16-after-upload.png`, body text shows `Uploaded: chart/66dbca2f.../a303d4d5...pdf` + Remove | PASS |
| 16 | 12 | Remove button clears FileDrop back to empty state | Click Remove; re-read body text | Body text reverts to "Drop a file or click to pick" without any "Uploaded:" line | PASS |
| 17 | 11 | Uploaded PDF chart renders inline via signed-get iframe on the song detail | Open Wonderwall detail (existing seed song) | `./screenshots-rattrapage-2026-05-26/09-song-detail-wonderwall.png`, iframe ref `chart/272f1b3c.../082dc53f....pdf` rendered | PASS |
| 18 | 15 | MB-enriched fields render on the new-song form (Album, Duration, MusicBrainz ID) | After clicking a hit, scroll body — innerText shows "MUSICBRAINZ METADATA\nAlbum\nWonderwall (OASIS)\nDuration\n3:34\nMusicBrainz ID\nb344d142-…" | innerText slice 1050-1500 confirms panel content | PASS |
| 19 | 17a | `/sessions` page has Concert + Practice create buttons | Open `/sessions`, snapshot | `./screenshots-rattrapage-2026-05-26/03-sessions-list.png` | PASS |
| 20 | 17a | CreateConcertDialog has date/time + venue + capacity + gear inputs, default date ≈ tomorrow at 8 PM | Click Concert; snapshot | `./screenshots-rattrapage-2026-05-26/06-create-concert-dialog.png` — date 5/27/2026 08:00 PM, Venue, Capacity, Gear, Cancel, Create | PASS |
| 21 | 17a | CreatePracticeDialog has date + Prepared Concert dropdown filtered to future concerts | Click Practice; snapshot | `./screenshots-rattrapage-2026-05-26/07-create-practice-dialog.png` — dropdown shows "Le Sunside — 6/15/2026, 8:00:00 PM" (only future concert in seeds) | PASS |
| 22 | 17a | Submitting a valid concert form lands on the new session detail page | Fill Venue = "Test Venue (rattrapage)", click Create | URL becomes `/sessions/b7d8c09e-…`, POST `/api/sessions` 201 | PASS |
| 23 | 17a | Delete affordance: trash icon per session row, opens "Delete this session?" confirm | Click row 14's delete; snapshot dialog | `./screenshots-rattrapage-2026-05-26/08-delete-confirm.png` — "Delete this session? Its setlist (if any) goes with it." Cancel / Delete | PASS |
| 24 | 17a | Cancel keeps row; Delete removes row immediately + DELETE 200 | Delete the newly-created Test Venue session; recount | Row count dropped from N to N-1 instantly; DELETE `/api/sessions/b7d8c09e-…` 200 followed by GET `/api/sessions` refetch | PASS |
| 25 | 17b | Setlist entry energy slider updates value instantly when adjusted | Focus first slider on setlist editor; press ArrowLeft ×2 from value 7 | Slider value displayed as `5` immediately in next snapshot; PUT `/api/setlists/.../entries/...` 200 follows | PASS |
| 26 | 17b | Slider change persists across reload | Reload session detail | Slider stays at 5 (was 7 originally) | PASS |
| 27 | 17b | Setlist entry drag-to-reorder is instant (no flash through old order) | Attempt `agent-browser drag @e24 @e16` on setlist drag handles | No reorder, no network call — dnd-kit pointer-event synthesis is not faithfully reproduced by agent-browser. Could not verify the optimistic path through automation. | UNVERIFIABLE |
| 28 | 17c | Bars kanban card drag between columns is instant | Switch /bars to Kanban; create one "Test Bar"; drag from Lead region to Contacted region | Card immediately moved (LEAD 0 → CONTACTED 1); PUT `/api/bars/...` 200 in background | PASS |
| 29 | 17c | Members mastery matrix: scroll-wheel on a cell increments instantly | Open `/members`; focus Arn × Chant cell (value 0); dispatch wheel(deltaY -100) | Cell value displayed as `1` instantly; PUT `/api/mastery/defaults` 200 follows | PASS |
| 30 | 17c | Right-click on a mastery cell clears to default instantly | Dispatch `contextmenu` on the same cell | Cell value displayed as `0` instantly; DELETE `/api/mastery/defaults/.../...` 200 follows | PASS |
| 31 | 17c | Bars list inline create feels instant | Fill "Test Bar (rattrapage)" in the inline Save form on /bars; submit | Row appears in list ; POST `/api/bars` 201 | PASS |

## B. Non-regression sweep on round-6 PASS rows

| # | Assertion | Verdict |
|---|---|---|
| R-01 | Auth gate redirects unauthenticated users to `/login` | PASS — fresh context lands on the login form |
| R-02 | Sidebar nav (Catalog / Sessions / Setlists / Bars / Members / Instruments) with badge counts | PASS — `Sessions 1 / Setlists 1 / Bars 1` visible after seeding |
| R-03 | Dark mode triggered by OS `prefers-color-scheme: dark` | PASS — `agent-browser set media dark` + reload renders dark palette (`./screenshots-rattrapage-2026-05-26/24-dark-mode.png`) |
| R-04 | Mobile slide-over nav at < 1024 px width | PASS — at 375 × 812 px, hamburger opens left-side panel (`./screenshots-rattrapage-2026-05-26/23-mobile-nav-open.png`) |
| R-05 | Mode Scène fullscreen dark canvas + transpose ±1 + font size ±A + ChordPro rendered | PASS — `/catalog/02e1ab6a-.../scene` shows the layout (`./screenshots-rattrapage-2026-05-26/21-mode-scene.png`) |
| R-06 | ESC exits Mode Scène back to song detail | PASS — `Escape` returns to `/catalog/02e1ab6a-...` |
| R-07 | Stale bar banner ("Stale · —") visible on a bar untouched > 60 days | PASS — newly-created "Test Bar (rattrapage)" displays "Stale · —" pill in the kanban card (`./screenshots-rattrapage-2026-05-26/19-bars-kanban-with-bar.png`) |
| R-08 | Catalog renders cleanly at 375 px (mobile-first layout) | PASS — `./screenshots-rattrapage-2026-05-26/22-catalog-mobile.png` |
| R-09 | Catalog status tabs with badge counts (All / Concert-ready / Rehearsed / In progress / Ideas) | PASS — counts `All 4 / Concert-ready 0 / Rehearsed 1 / In progress 0 / Ideas 3` |
| R-10 | Energy + Mastery chips per song card | PASS — `E 5 · M —` etc. visible per card |

PWA offline reads, sparkline above setlist entries, transition warnings and external-link iframe rendering were not exercised in this rattrapage pass — they were not changed in rounds 7 → 17c, and the existing round-6 evidence stands. Calling that out explicitly so the operator knows the sweep was not exhaustive.

## C. Verdict summary

- 26 PASS, 2 FAIL, 1 UNVERIFIABLE on the 29 new rows (rounds 7-17c).
- All 10 spot-checked round-6 non-regression rows still PASS.
- **Top FAILs**:
  1. **Row 09 (round 10) — API calls are cross-origin, not same-origin `/api/...`.** Every authenticated fetch goes to `pragma-pr-26-api.preview.borso.fr/api/...` from `pragma-pr-26.preview.borso.fr`, with `access-control-allow-origin: https://pragma-pr-26.preview.borso.fr` + `access-control-allow-credentials: true` in the response. The round-10 verdict claimed the cutover to same-origin `/api/` proxying through CloudFront — the live preview clearly still uses cross-subdomain CORS. Either round 10 was mis-asserted at verdict time, or the CloudFront behaviour shipped only for prod / never made it into the preview stack. Worth a fresh check of `infra/cdk/src/constructs/preview-app.ts` or wherever the `/api/*` behaviour should live.
  2. **Row 08 (round 10) — `/sessions/<id>/setlist` deep link renders a blank app shell.** Console: `No routes matched location "/sessions/cb57…/setlist"`. The router has no `/sessions/:id/setlist` route — the setlist editor lives inline on the session detail page. Either the round-17b plan (which references a setlist deep-link) is incorrect, or the route should have been added and was missed. The empty page is a real UX hazard for anyone bookmarking the URL the spec implies.
- **UNVERIFIABLE row 27 (setlist drag-to-reorder optimistic):** dnd-kit relies on synthesised pointer events that agent-browser doesn't reproduce in headless chromium. Cross-checked the same dnd flow on bars kanban (row 28) where it does work via `agent-browser drag` — the kanban likely uses HTML5 native drag, the setlist uses pointer-based dnd-kit. Need either a different test driver or a manual confirmation by the user.

## Verdict: FAIL
