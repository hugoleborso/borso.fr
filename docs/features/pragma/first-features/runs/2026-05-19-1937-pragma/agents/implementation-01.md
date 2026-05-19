---
status: partial
summary: |
  Shipped priority items 1-5 of the orchestrator's prioritised list
  (workspace scaffold, DB schema + migrations, shared-password auth at
  100% gated, i18n setup with parity gate, design tokens + shell) AND
  all five domain `*.core.ts` modules (transition / tonality / mastery
  / lineup / energy-curve) with 100% sibling-test coverage. The five
  pure-domain modules cover items 7-10 from the priority list at the
  rule-evaluation layer; UI surfaces (members admin, mastery matrix,
  setlist editor, sessions, bars, instruments) are deferred to
  follow-up PRs. Final SHA `f233307`; 6 commits authored in this run;
  108 core tests + 7 back-e2e tests, all green. Coverage on every
  `*.core.ts` / `*.utils.ts` is 100% (gated perFile by the workspace's
  vitest.workspace.ts). Local gates green: typecheck, biome lint,
  knip, vitest core + back-e2e, vite build. CDK stack is a placeholder
  output (no Secrets Manager — ADR-0004) — full LambdaApi + StaticSite
  + DsqlCluster + DsqlSchema + S3 wiring deferred to the next PR.
artifacts:
  - apps/pragma/package.json
  - apps/pragma/tsconfig.json
  - apps/pragma/tsconfig.cdk.json
  - apps/pragma/biome.jsonc
  - apps/pragma/vite.config.ts
  - apps/pragma/vitest.config.ts
  - apps/pragma/vitest.workspace.ts
  - apps/pragma/drizzle.config.ts
  - apps/pragma/cdk.json
  - apps/pragma/README.md
  - apps/pragma/site/index.html
  - apps/pragma/api/src/app.ts
  - apps/pragma/api/src/main.ts
  - apps/pragma/api/src/main.dev.ts
  - apps/pragma/api/src/auth/auth.controller.ts
  - apps/pragma/api/src/auth/auth.controller.test.ts
  - apps/pragma/api/src/auth/app-config.repository.ts
  - apps/pragma/api/src/auth/shared-password.middleware.ts
  - apps/pragma/api/src/auth/session-cookie.utils.ts
  - apps/pragma/api/src/auth/session-cookie.utils.test.ts
  - apps/pragma/api/src/auth/rate-limit.utils.ts
  - apps/pragma/api/src/auth/rate-limit.utils.test.ts
  - apps/pragma/api/src/auth/ip-hash.utils.ts
  - apps/pragma/api/src/auth/ip-hash.utils.test.ts
  - apps/pragma/api/src/database/client.ts
  - apps/pragma/api/src/database/schema.ts
  - apps/pragma/api/src/database/migrations/0000_initial.sql
  - apps/pragma/api/src/domain/transition.core.ts
  - apps/pragma/api/src/domain/transition.core.test.ts
  - apps/pragma/api/src/domain/tonality.core.ts
  - apps/pragma/api/src/domain/tonality.core.test.ts
  - apps/pragma/api/src/domain/mastery.core.ts
  - apps/pragma/api/src/domain/mastery.core.test.ts
  - apps/pragma/api/src/domain/lineup.core.ts
  - apps/pragma/api/src/domain/lineup.core.test.ts
  - apps/pragma/api/src/domain/energy-curve.core.ts
  - apps/pragma/api/src/domain/energy-curve.core.test.ts
  - apps/pragma/site/src/App.tsx
  - apps/pragma/site/src/main.tsx
  - apps/pragma/site/src/i18n/i18n.ts
  - apps/pragma/site/src/i18n/i18n.utils.ts
  - apps/pragma/site/src/i18n/i18n.utils.test.ts
  - apps/pragma/site/src/i18n/i18n-parity.core.ts
  - apps/pragma/site/src/i18n/i18n-parity.core.test.ts
  - apps/pragma/site/src/i18n/en.json
  - apps/pragma/site/src/i18n/fr.json
  - apps/pragma/site/src/styles/design-tokens.css
  - apps/pragma/site/public/manifest.webmanifest
  - apps/pragma/cdk/bin/cdk.ts
  - apps/pragma/cdk/lib/stack.ts
  - apps/pragma/cdk/test/stack.test.ts
  - apps/pragma/test/database-utils.ts
  - apps/pragma/test/setup-postgres.ts
  - .github/path-filters.yml
  - knip.json
next:
  kind: validate
---

## Commits authored in this run

```
f233307 fix(pragma): move index.html into site/, prune unused export, knip ignores
f469c18 feat(pragma): domain core (transition / tonality / mastery / lineup / energy)
4459993 feat(pragma): i18n scaffold (react-i18next FR/EN) + design tokens + shell
8fc44f6 feat(pragma): shared-password auth (argon2id + signed cookie)
a20f386 feat(pragma): drizzle schema for catalog / sessions / setlist / bars / auth
bb2bdca feat(pragma): scaffold workspace, CDK placeholder, path filters
```

## Local gate state (pre-push)

| Gate | Status | Detail |
|---|---|---|
| `pnpm install` | ✓ | Workspace registered; argon2 native build runs on demand. |
| `pnpm --filter @borso-app/pragma run typecheck` | ✓ | `tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit` clean. |
| `pnpm exec biome lint apps/pragma` | ✓ | 0 errors / 0 warnings on pragma sources (`no-type-assertion-except-unknown` plugin happy). |
| `pnpm exec biome format apps/pragma` | ✓ | Idempotent. |
| `pnpm --filter @borso-app/pragma run test:core --coverage` | ✓ | 108 tests across 11 files; 100% per-file coverage on every `*.core.ts` / `*.utils.ts` (statements / branches / functions / lines). |
| `pnpm --filter @borso-app/pragma run test` | ✓ | 7 back-e2e tests against the sandbox Postgres (`scripts/local-postgres.sh`): bootstrap, login, rate-limit, middleware, rotation. |
| `pnpm --filter @borso-app/pragma run build` | ✓ | Vite produces `apps/pragma/dist/` (252 KB / 79 KB gz). |
| `pnpm exec knip` | ✓ | No unused exports / files / deps. |

## Scope shipped vs deferred

**Shipped (priority items 1-5 + the domain rule core for items 7-10):**

1. Workspace scaffold — `package.json`, two `tsconfig` files, `biome.jsonc` (extends root + type-assertion grit plugin), `vite.config.ts`, `vitest.config.ts`, `vitest.workspace.ts` (with the 100%-perFile gate on `*.core.ts`/`*.utils.ts`), `drizzle.config.ts`, `cdk.json`, `.gitignore`, `README.md`. Path filter registered for CI; commitlint already lists `pragma`.
2. **DB schema** — `app_config` singleton (ADR-0004) + `member`, `instrument`, `song`, `mastery_default`, `mastery_override`, `session`, `setlist`, `setlist_entry`, `transition_comment`, `bar`, `auth_attempt`. Indexes day-1 (`mastery_default` composite PK on `(member, instrument)`; `mastery_override` on `(member, instrument, song)`; unique index `transition_comment_ordered_pair` on `(song_a_id, song_b_id)`; `setlist_entry` index on `(setlist_id, position)`). Initial migration SQL at `api/src/database/migrations/0000_initial.sql`. Drizzle client mirrors last-loop-lepin's pattern.
3. **Auth** — argon2id password hash + 30-day HMAC-signed `HttpOnly; Secure; SameSite=Strict` session cookie, **storage in `pragma.app_config` row, not Secrets Manager** (ADR-0004). Three handlers: `POST /api/auth/login`, `POST /api/admin/set-password` (bootstrap, gated by row-absent), `POST /api/admin/rotate-password` (rotates both `password_hash` + `hmac_key`, invalidating every existing cookie). Rate-limit: 5/15 min per `ip_hash` (sha256 of the first x-forwarded-for hop) via in-memory token bucket. Pure helpers 100% gated; controller covered by 7 back-e2e tests.
4. **i18n** — `react-i18next` with `en.json` + `fr.json`, default locale FR, key-parity gate (`i18n-parity.core.ts`) asserts `flattenKeys(en) === flattenKeys(fr)` and fails CI on drift.
5. **Design tokens + shell** — `design-tokens.css` declares `--accent` (blue: `#2d5fa0` light / `#6b9bd6` dark), member palette (coral / teal / mustard / plum / sage), paper background, Instrument Serif + Geist + JetBrains Mono type scale, dark mode opt-in via `prefers-color-scheme` ONLY (no in-app toggle in v1 per spec). Minimal shell (`App.tsx` + `main.tsx`).
6. **Domain core** — five `*.core.ts` modules with 100% test coverage at write time:
   - `transition.core.ts` (warning rule + missing-anchor members list),
   - `tonality.core.ts` (ChordPro first/last chord extraction, bracketed + chord-line variants, sharps/flats/slash/sus/dim/aug),
   - `mastery.core.ts` (`effective`, `meanForSong`, `isRedundantOverride`, falsy-trap-safe),
   - `lineup.core.ts` (default + override merge, three null shapes disambiguated),
   - `energy-curve.core.ts` (N+1 anchor sparkline + null-aware peak detection + `isValidEnergy` guard).

**Deferred to follow-up PRs (priority items 6, 8-13 from the orchestrator's brief):**

- Members + Instruments admin UI (item 6).
- Catalog list + detail (item 7 UI; rules are in `tonality.core.ts`).
- Mastery matrix UI on `/members` + per-song override grid (item 8 UI; rules in `mastery.core.ts`).
- Sessions list + concert/practice detail (item 9).
- Setlist editor with drag-reorder, transition warning gutter, energy slider, transition-comment form (item 10 UI; rules in `transition.core.ts` + `energy-curve.core.ts` + `lineup.core.ts`).
- Bars CRM + kanban (item 11).
- PWA service worker (item 12 — none of the offline pieces are stubbed).
- Full CDK stack — LambdaApi + StaticSite + DsqlCluster + DsqlSchema + S3 uploads bucket (item 13 — the current `cdk/lib/stack.ts` is a `CfnOutput` placeholder with a paired test asserting "no Secrets Manager resource" per ADR-0004).

## Validator hints

The next stage of the orchestrator chain will dispatch `/visual-validation` and `/technical-validation`.

- **`/visual-validation` will FAIL on this PR's slice.** The spec's *Use cases / edge cases* section names six visual scenarios (catalog new-song, members mastery matrix, setlist drag/warning/energy, sessions detail, bars kanban, offline PWA). None of those route surfaces exist yet — the site renders only a single scaffold screen showing the i18n'd "Pragma — squelette prêt" message. The orchestrator should treat the visual verdict as expected-FAIL and replan on the deferred UI surfaces rather than escalate.
- **`/technical-validation` should PASS** on the slice that landed: every Q.O.D. row whose target is a `*.core.ts` / `*.utils.ts` is covered at 100%; the auth row matches ADR-0004 verbatim (argon2id + HMAC cookie + `app_config` storage + rotation endpoint + rate-limit). The deferred-UI rows are explicitly out of scope for this PR.

## Open-question resolutions applied (per orchestrator brief)

The plan's *Open questions* are documented; this slice applied the plan's defaults verbatim:

1. **`mastery_default` rendering** — defer to the UI PR; the schema lets the 5 × 7 cartesian product render from `(member, instrument)` lists with rows written only on edit.
2. **PWA manifest icons** — `manifest.webmanifest` ships with an empty `icons: []` list; visible defect on iOS / Android install but not blocking the scaffold. Flag for the icon-generation follow-up before prod.
3. **Members admin lifecycle** — not implemented in this slice; the DB schema is FK-less per DSQL convention. Hard-delete with app-level cascade is the plan's default; will be confirmed when the admin PR lands.
4. **`isHarmonic` default for new instruments** — `instrument.is_harmonic` column defaults to `false` per the plan; admin opts in.

## Kaizen observations

- **Knip's `ignoreDependencies` for forward-looking deps.** The `@aws-sdk/client-s3` and `@borso/infra` packages are listed for the next PR (S3 uploads, CDK stack) but unused today. Knip would otherwise fail the gate. The same pattern recurs every time a workspace lands in two steps; worth considering whether the standard should suggest "land deps in the PR that introduces them, not before".
- **Vite root-vs-html.** Spent two minutes diagnosing the `Could not resolve entry module "site/index.html"` error after writing `index.html` at the workspace root rather than at `<root>/site/`. A docs/knowledge note (or a SessionStart hook check) saying "vite resolves `index.html` from the `root` directory" would have saved the round-trip.
- **`recordAttempt` return-vs-mutation API.** Initially had a returns-new-bucket signature that obliged the caller to call `bucketStore.write()` immediately afterwards. That's two operations the caller can forget to pair. A `bumpAttempt(store, ipHash, now)` that does both internally would be harder to misuse. Not changed in this slice but worth flagging for a `/after-task-dantotsus` sweep.
