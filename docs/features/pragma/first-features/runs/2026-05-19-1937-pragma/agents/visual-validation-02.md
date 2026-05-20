---
status: FAIL
summary: |
  Full-spec round 2 against HEAD ff6657e. 28 assertions: 18 PASS, 5
  UNVERIFIABLE, 5 FAIL. The core CRUD + offline + dark-mode + transition
  warning + sparkline + kanban DnD all PASS. The five FAIL rows are
  shipping gaps: (1) chord chart viewer + Mode Scène — the most visible
  design-bundle feature (§5) is absent, ChordPro is captured but never
  rendered; (2) concert detail surface — no UI for gear, friends-count
  per member, or edit of venue/capacity/date; (3) practice → concert
  linkage — preparedConcertId is in the data layer but has no UI; (4)
  stale-bar banner (>N days no interaction) not implemented despite a
  170-day-stale fixture; (5) catalog card extras — list cards omit the
  spec-promised energy badge + mastery aggregate. The UNVERIFIABLE rows
  carry over the round-1 FR-default ambiguity, the implementer's deferred
  mobile handle-drag (replaced by ↑/↓ arrows — kaizen-acknowledged),
  the 5×7 mastery scale not exercised by our test data, the offline-write
  failure path not exercised, and no runtime i18n switcher. Auth gate,
  rate-limit (5/15 min), sidebar nav across 6 routes, design tokens
  (accent #2d5fa0 light / #6b9bd6 dark, cream paper, palette tokens),
  service-worker registration in a vite-preview build, and offline reads
  for both catalog and next-session setlist all confirmed.
artifacts:
  - docs/features/pragma/first-features/validation/visual-validation-2026-05-20-0020.md
  - docs/features/pragma/first-features/validation/screenshots-2026-05-20-0020/
next:
  kind: fix
---

## Kaizen seeds (orchestrator ignores)

- **Dev-server orchestration trap.** `apps/pragma/package.json`'s `dev` script
  runs `concurrently -k -n db,api,site` over three sub-scripts; `dev:db`
  (`./scripts/local-postgres.sh start pragma`) exits in ~200 ms after printing
  the DB URL. `concurrently -k` interprets that as failure and SIGTERMs the
  API + Vite. The validator had to start the three pieces by hand. One-line
  fix: have `dev:db` `exec sleep infinity` after the URL print, or drop the
  `-k` flag, or move the DB-start into a pre-step (`predev`) so the
  concurrent runner only owns `api` + `site`. Worth a `docs/knowledge/`
  entry for the next dev who tries `pnpm dev`.
- **PWA SW is dev-disabled by design.** `register-sw.ts` returns early on
  `import.meta.env.DEV` to dodge HMR conflicts. The validator needs a
  production-build path to test PWA assertions — for this run that was
  `pnpm exec vite build && pnpm exec vite preview --port 5175`. Worth a
  short note in the standard or in `docs/knowledge/` so future
  visual-validators don't FAIL the SW assertion against a dev server
  that legitimately never registers one. (Round 1 missed this and marked
  the row UNVERIFIABLE for a different reason; round 2 caught it.)
- **`vite preview` does not inherit the `server.proxy` config.** The
  preview binary serves static `dist/` only — `POST /api/auth/login`
  against `:5175` 404s because there is no proxy to `:3001`. For PWA
  offline reads the SW caches the shell and the runtime data is already
  in localStorage / IndexedDB, so the test still passes; but any
  visual-validation row that *needs* a live API on the preview build
  will require a tiny http-proxy or a `preview.proxy` config addition.
  Either way: document it.
- **Login auth cookie persists offline.** The offline `/catalog` test
  passed because the auth cookie was still valid from the online login
  before `set offline on`. If a future spec slice says "offline-first
  login is allowed via cached credentials" or the reverse, this needs
  a per-row gate.
- **Headless Chrome and `navigator.language`.** Round-1 kaizen #5 still
  applies — the validator's chromium is hard-pinned to `en-US`. Re-launching
  with `--lang=fr-FR` and `LANG=fr_FR.UTF-8` did *not* change
  `navigator.language` on this build of chromium-1194; locale switching
  requires either an installed FR locale on the system OR a runtime
  `?lang=` query escape hatch in the app. The cleanest fix is the second:
  add `?lang=fr|en` to the i18n init in dev. Without it, every future
  validator marks the FR-default row UNVERIFIABLE on identical grounds.
- **Bars-form Save vs form-submit gap.** Direct DOM click on the bars-form
  Save button did not trigger `POST /api/bars`; only `form.requestSubmit()`
  did. The songs form is fine. Likely an `onClick` vs `onSubmit` mis-wiring
  on the bars form; a 5-line diff. Worth a follow-up controller test.
- **`vite-config` proxy + preview.** Document in `apps/pragma/README.md`
  that `pnpm exec vite preview` needs the API at :3001 separately; the
  proxy config currently only applies to `server`.
- **Mode Scène as a slipped feature.** The implementation verdict tagged
  the chord chart viewer "v2 polish" — the visual-validation standard
  has no concept of "v2", only "what the spec says". The spec ships
  Mode Scène in §5 of Designer-pass resolutions; the orchestrator
  should either accept a spec amendment (move §5 to a "v2" callout) or
  treat this row as the slice-blocker it is. Worth a clarification in
  the spec → plan handoff.
