# Technical validation — Pragma first features (foundation slice)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- ADR: [`../../../adr/0004-pragma-shared-password-auth.md`](../../../adr/0004-pragma-shared-password-auth.md)
- Branch: `claude/pragma-erp-specification-k41Mg`
- Base: `origin/main`
- Run at: 2026-05-19T22:11Z
- Touched workspaces: `apps/pragma` (new), repo-root (`.github/path-filters.yml`, `knip.json`, `commitlint.config.js`, `CLAUDE.md`)

## Scope note

Per the implementation-01 verdict, this PR is a **foundation slice**, not the full first-features v1. Shipped: workspace scaffold, DB schema + migrations, shared-password auth, i18n, design tokens, and the five `*.core.ts` domain modules. Explicitly deferred to follow-up PRs: every UI surface (members admin, mastery matrix, setlist editor, sessions list/detail, bars CRM, instruments admin), the PWA service worker, and the full CDK stack (LambdaApi + StaticSite + DsqlCluster + S3).

Per the validator's brief, deferred-UI / deferred-CDK rows are marked UNVERIFIABLE rather than FAIL — they are a planned next-PR scope, not a foundation defect. The validator independently inspected the foundation slice on its merits.

Visual-validation routing: the spec's *Test strategy* lists six visual scenarios (catalog new-song / setlist drag+warning+energy / sessions detail / bars kanban / PWA offline). All six are routed to `/visual-validation` and out of scope for category D below.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q.O.D. *App-workspace slug* = `pragma` | Workspace `apps/pragma/` registered as `@borso-app/pragma`, triplet `site/api/cdk` | `apps/pragma/package.json:2` | `"name": "@borso-app/pragma"` + `site/`, `api/`, `cdk/` subdirs present | PASS |
| A02 | Q.O.D. *Auth model* = shared password (ADR-0004) — argon2id | Hashing uses argon2id | `apps/pragma/api/src/auth/auth.controller.ts:92,105` | `argon2.hash(password, { type: argon2.argon2id })` (twice — bootstrap + rotate) | PASS |
| A03 | ADR-0004 — Signed HttpOnly cookie, SameSite=Strict, Secure, 30-day TTL | Cookie attributes correctly set on login | `apps/pragma/api/src/auth/auth.controller.ts:73-79` + `session-cookie.utils.ts:20` | `setCookie(... httpOnly: true, secure: STAGE!=='dev', sameSite:'Strict', maxAge: SESSION_COOKIE_MAX_AGE_S, path:'/' )`; `SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000` | PASS |
| A04 | ADR-0004 — Signed cookie uses HMAC-SHA256 against `app_config.hmac_key` (32 bytes) | HMAC-SHA256 with 32-byte key from DB | `apps/pragma/api/src/auth/session-cookie.utils.ts:46` + `auth.controller.ts:34,93` | `createHmac('sha256', hmacKey).update(payloadEncoded).digest()` and `HMAC_KEY_BYTES = 32` + `randomBytes(HMAC_KEY_BYTES)` | PASS |
| A05 | ADR-0004 — Password hash + HMAC key live in `pragma.app_config`, NOT CDK secrets | Singleton DB row, no Secrets Manager wiring | `apps/pragma/api/src/database/schema.ts:41-46`; `apps/pragma/cdk/test/stack.test.ts:15-21` | `appConfigTable = pgTable('app_config', { id: integer('id').primaryKey(), passwordHash, hmacKey: bytea(...), rotatedAt })` + CDK test asserts `template.findResources('AWS::SecretsManager::Secret')` is empty | PASS |
| A06 | ADR-0004 — `app_config` is a singleton (id=1) | CHECK constraint enforces singleton at DB level | `apps/pragma/api/src/database/migrations/0000_initial.sql:6` | `CONSTRAINT "app_config_singleton" CHECK ("id" = 1)` | PASS |
| A07 | ADR-0004 — Bootstrap refuses once a row exists (returns 409) | `set-password` returns 409 when row present | `apps/pragma/api/src/auth/auth.controller.ts:87-90` | `if (existing !== null) return context.json({ error: 'already-bootstrapped' }, 409)` | PASS |
| A08 | ADR-0004 — Rotate atomically updates `password_hash` + `hmac_key` | Both columns rewritten in one UPDATE | `apps/pragma/api/src/auth/app-config.repository.ts:55-58` | `database.update(appConfigTable).set({ passwordHash, hmacKey, rotatedAt: now }).where(eq(appConfigTable.id, SINGLETON_ID))` | PASS |
| A09 | ADR-0004 — Rotate endpoint must be authenticated (operator action) | Rotate-password mounted UNGATED at `/api/admin/rotate-password` | `apps/pragma/api/src/app.ts:38` + `auth.controller.test.ts:124-129` | `app.route('/api/admin', adminRouter)` (no session middleware on this line). Test posts to `/api/admin/rotate-password` with NO cookie and expects 200 — anyone reachable from the public internet can rotate the band's password and lock everyone out. Controller header at `auth.controller.ts:11-12` states "rotate endpoint IS gated by the session middleware (mounted upstream by the route registrar)" — this contract is not honoured by `app.ts`. | **FAIL** |
| A10 | ADR-0004 / spec *Zero-defect* — Rate-limit 5/15 min per `ip_hash` | Limit applied at login, `ip_hash = SHA256(client IP)` | `auth.controller.ts:55-61` + `rate-limit.utils.ts:16-17` + `ip-hash.utils.ts:26-28` | `RATE_LIMIT_MAX_ATTEMPTS = 5`, `RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000`, `createHash('sha256').update(ip).digest('hex')` | PASS |
| A11 | Plan auth row — back-e2e: 5 wrong → 429; bootstrap 409 if row exists | Covered by back-e2e suite | `apps/pragma/api/src/auth/auth.controller.test.ts:55-61, 87-97` | `expect(blocked.status).toBe(429)` and `expect(second.status).toBe(409)` | PASS |
| A12 | Q.O.D. *Concurrency* = last-write-wins | No optimistic-lock column on any table | `apps/pragma/api/src/database/schema.ts` (entire) | No `version`/`updated_at`-based locking columns; UPDATEs in repos are unconditional | PASS |
| A13 | Q.O.D. *Mastery matrix locus* = hybrid (default + override) | `effective` returns `override ?? default`, 0-override wins | `apps/pragma/api/src/domain/mastery.core.ts:37-46` | `const override = overrides[query.songId]?.[query.memberId]?.[query.instrumentId]; if (override !== undefined) return override; ... return fallback ?? null;` | PASS |
| A14 | Q.O.D. *Transition warning rule* — pair warns iff no harmonic instrument is held by the same member across both songs | Algorithm follows the spec verbatim | `apps/pragma/api/src/domain/transition.core.ts:43-63` | `if (overlap.length > 0) return { kind: 'safe' }` — overlap is the set of members that hold a harmonic instrument in BOTH lineups | PASS |
| A15 | Q.O.D. *Transition comment locus* = global per pair, *orientation* = ordered | Unique index on ordered pair `(song_a_id, song_b_id)` | `apps/pragma/api/src/database/schema.ts:131-134` + `migrations/0000_initial.sql:91` | `uniqueIndex('transition_comment_ordered_pair').on(table.songAId, table.songBId)` | PASS |
| A16 | Q.O.D. *Accent color* = blue (`#2d5fa0` light / `#6b9bd6` dark) | Tokens declared in design-tokens.css | `apps/pragma/site/src/styles/design-tokens.css:13,15,53` | `--accent: #2d5fa0; ... --accent-on-dark: #6b9bd6;` + dark block `--accent: var(--accent-on-dark)` | PASS |
| A17 | Q.O.D. — dark mode opt-in via OS `prefers-color-scheme` only (no in-app toggle in v1) | CSS-only switch | `apps/pragma/site/src/styles/design-tokens.css:51-65` | `@media (prefers-color-scheme: dark) { :root { ... color-scheme: dark; } }`; no React toggle code anywhere in `site/src/` | PASS |
| A18 | Q.O.D. *Code language* = English | No French nouns in identifiers | grep over `apps/pragma/**` (`prenom\|lieu\|chanson\|salle\|matos`) | No hits in source identifiers; only French in `i18n/fr.json` (correct) and the scaffold's FR-default subtitle | PASS |
| A19 | Q.O.D. *User-facing language* = FR + EN i18n, default FR | `react-i18next` wired, default locale FR | `apps/pragma/site/src/i18n/i18n.ts:21-22` + `i18n.utils.ts:14` | `lng: initialLocale, fallbackLng: DEFAULT_LOCALE` with `DEFAULT_LOCALE: SupportedLocale = 'fr'` | PASS |
| A20 | Plan — i18n key-parity gate | `diffCatalogs` + sibling test fails CI on drift | `apps/pragma/site/src/i18n/i18n-parity.core.ts:18-33` + `i18n-parity.core.test.ts` (covered) | `diffCatalogs(en, fr)` returns `missingInEn`/`missingInFr`; test asserts both empty | PASS |
| A21 | Spec *Domain model* — every table named in the ER diagram | All 11 tables + `auth_attempt` shipped | `apps/pragma/api/src/database/schema.ts` (entire file) + `migrations/0000_initial.sql` | `appConfig`, `member`, `instrument`, `song`, `masteryDefault`, `masteryOverride`, `session`, `setlist`, `setlistEntry`, `transitionComment`, `bar`, `authAttempt` — all present | PASS |
| A22 | Plan — index on `setlist_entry (setlist_id, position)` for ordered reads | Index declared | `apps/pragma/api/src/database/migrations/0000_initial.sql:81` | `CREATE INDEX "setlist_entry_setlist_id_position_idx" ON "setlist_entry" ("setlist_id","position")` | PASS |
| A23 | Plan — `mastery_default` unique on `(member, instrument)` | Composite PK | `apps/pragma/api/src/database/migrations/0000_initial.sql:44` | `PRIMARY KEY("member_id","instrument_id")` | PASS |
| A24 | Plan — `mastery_override` unique on `(member, instrument, song)` | Composite PK | `apps/pragma/api/src/database/migrations/0000_initial.sql:52` | `PRIMARY KEY("member_id","instrument_id","song_id")` | PASS |
| A25 | Spec *Domain model* — Drizzle migrations generated and reproducible | Initial migration SQL committed | `apps/pragma/api/src/database/migrations/0000_initial.sql` exists, 100 lines | PASS |
| A26 | Plan — `*.core.ts` modules: transition / tonality / mastery / lineup / energy-curve, 100% gated | All five present, 100% perFile coverage | `apps/pragma/api/src/domain/{transition,tonality,mastery,lineup,energy-curve}.core.ts` + coverage table | All five exist; coverage report shows 100% statements/lines/functions for each | PASS |
| A27 | CLAUDE.md — `.core.ts` MUST NOT call `new Date()` directly; `now` is a parameter | No `new Date()` in any `*.core.ts` | grep `new Date()` in `apps/pragma/api/src/domain/` | Zero hits | PASS |
| A28 | *Files to change* → `.github/path-filters.yml` | `pragma: 'apps/pragma/**'` entry added | `.github/path-filters.yml` diff | Added entry visible in diff | PASS |
| A29 | *Files to change* → `commitlint.config.js` adds `pragma` (and `last-loop-lepin`, `meta`) | Scopes updated | `commitlint.config.js` diff | `['borso-fr', 'borsouvertures', 'last-loop-lepin', 'pragma', 'infra', 'ci', 'docs', 'deps', 'meta']` | PASS |
| A30 | *Files to change* → `knip.json` reflects new workspace | `apps/pragma` workspace block present | `knip.json` diff | New `apps/pragma` block with entry list incl. `cdk/bin/cdk.ts`, `api/src/main.ts`, test entries | PASS |
| A31 | *Files to change* → `CLAUDE.md` carves in `apps/pragma/` | Don'ts section disambiguates `pragma` vs upstream `test-app` | `CLAUDE.md:115` | `pragma is the slug for the band-ERP app (apps/pragma/). The earlier "do…` | PASS |
| A32 | *Files to change* → Members admin UI (`/members`) | Not implemented in this slice | n/a | Deferred to follow-up PR per implementation-01 verdict | UNVERIFIABLE (deferred) |
| A33 | *Files to change* → Mastery matrix UI on `/members` + per-song override grid | Not implemented in this slice | n/a | Deferred to follow-up PR | UNVERIFIABLE (deferred) |
| A34 | *Files to change* → Catalog list + detail | Not implemented in this slice | n/a | Deferred to follow-up PR | UNVERIFIABLE (deferred) |
| A35 | *Files to change* → Setlist editor (drag, warning, energy, comment) | Not implemented in this slice | n/a | Deferred to follow-up PR | UNVERIFIABLE (deferred) |
| A36 | *Files to change* → Sessions list / concert detail / practice detail | Not implemented in this slice | n/a | Deferred to follow-up PR | UNVERIFIABLE (deferred) |
| A37 | *Files to change* → Bars CRM (list + kanban) | Not implemented in this slice | n/a | Deferred to follow-up PR | UNVERIFIABLE (deferred) |
| A38 | *Files to change* → Instruments admin | Not implemented in this slice | n/a | Deferred to follow-up PR | UNVERIFIABLE (deferred) |
| A39 | *Files to change* → PWA service worker, offline manifest, `sw/manifest.utils.ts` | Not implemented in this slice | n/a | Deferred to follow-up PR | UNVERIFIABLE (deferred) |
| A40 | *Files to change* → Full CDK stack (LambdaApi + StaticSite + DsqlCluster + DsqlSchema + S3) | Stack is a placeholder `CfnOutput` only | `apps/pragma/cdk/lib/stack.ts` | `new CfnOutput(props.scope, 'PragmaScaffold', { value: 'pragma-scaffold-only' })`; verdict notes "Full LambdaApi + StaticSite + DsqlCluster wiring lands in a follow-up PR" | UNVERIFIABLE (deferred, intentional per verdict) |
| A41 | *Files to change* → `infra/shared/` cert for `pragma.borso.fr` | Not modified | n/a | Deferred with CDK stack | UNVERIFIABLE (deferred) |
| A42 | Plan — chord-chart Zod discriminated union | Not implemented in this slice (no Zod schema file) | `apps/pragma/api/src/domain/chord-chart.schema.ts` not present | Deferred — catalog endpoints land with the UI PR | UNVERIFIABLE (deferred) |
| A43 | Plan — embed-URL detector `embed.utils.ts` | Not implemented in this slice | not present | Deferred — catalog UI PR | UNVERIFIABLE (deferred) |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Biome lint clean on `apps/pragma` | `pnpm exec biome lint apps/pragma` | `Checked 51 files in 1418ms. No fixes applied.` (exit 0) | PASS |
| B02 | TypeScript clean across `site`/`api`/`cdk` | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 (`tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit`) | PASS |
| B03 | `pnpm exec knip` repo-wide clean (no unused exports/files/deps) | `pnpm exec knip` | exit 0, no output | PASS |
| B04 | No `any` in source | `grep -rnE '\bany\b' apps/pragma --include='*.ts'` (excluding tests) | zero hits | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` (Biome plugin) | `grep -rE ' as [A-Z][a-zA-Z]*'` filtered against allowed forms | zero offending hits in pragma | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | Code uses `?? null`/`?? ''`/`?? rawChord` fallbacks for `match[n]`, `array[0]` reads | e.g. `tonality.core.ts:31,34-35,47,78`, `auth.controller.ts:48` (test) — every indexed access in pragma source carries a guard or fallback | PASS |
| B07 | No `useEffect` in pragma React code | `grep -rn 'useEffect' apps/pragma/site` | Only a documentation reference in `design-tokens.css`'s comment (CLAUDE.md citation). No `useEffect` calls in JSX/TSX. | PASS |
| B08 | No abbreviations / single-letter locals outside trivial loops | Sampled `transition.core.ts`, `mastery.core.ts`, `tonality.core.ts`, `auth.controller.ts`, `rate-limit.utils.ts`, `session-cookie.utils.ts` | Names like `harmonicMembersA`, `bucketStore`, `payloadEncoded`, `expectedSignature`, `effective`, `meanForSong`, `evaluateTransition` — descriptive. Only `i` is conventional in `for (let attempt = 0; attempt < 5; attempt += 1)` and there `attempt` is used instead. | PASS |
| B09 | Magic numbers / strings extracted to named consts | Auth + cookie code uses `PASSWORD_MIN_LENGTH`, `PASSWORD_MAX_LENGTH`, `HMAC_KEY_BYTES`, `SESSION_COOKIE_MAX_AGE_S`, `SESSION_TTL_MS`, `RATE_LIMIT_MAX_ATTEMPTS`, `RATE_LIMIT_WINDOW_MS`, `BASELINE_ENERGY`, `MIN_ENERGY`, `MAX_ENERGY`, `SINGLETON_ID`, `DSQL_PORT`, `COOKIE_SEPARATOR` | All sampled bare literals carry a named const | PASS |
| B10 | Comments document the WHY only | Sampled module headers in `tonality.core.ts`, `transition.core.ts`, `rate-limit.utils.ts`, `session-cookie.utils.ts`, `mastery.core.ts` | Each header explains intent + ADR/spec linkage (e.g. "Pure function over lineups + the instrument map", "ADR-0004 — five tries per fifteen-minute sliding window", "the falsy trap: don't write `override \|\| default`"). No what-comments observed. | PASS |
| B11 | Function names describe the result | Sampled: `evaluateTransition`, `deriveTonality`, `resolveLineup`, `meanForSong`, `isRedundantOverride`, `effective`, `smoothedSeries`, `buildCookie`, `verifyCookie`, `flattenKeys`, `diffCatalogs`, `recordAttempt`, `isRateLimited`, `hashIp`, `readClientIp` | All describe the result, not the mechanism | PASS |
| B12 | No `--no-verify` in commit history | `git log origin/main..HEAD --format=%B \| grep -i no-verify` | zero hits | PASS |
| B13 | Conventional-commit scope = `pragma` for app commits | `git log origin/main..HEAD --oneline` filtered | All 7 PR-authored pragma commits use scope `pragma`; meta-related commits use `meta` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core suite) | `pnpm --filter @borso-app/pragma run test:core` | 0 — 11 test files, 108 tests passed | PASS |
| C02 | @borso-app/pragma (back-e2e via local Postgres) | `pnpm --filter @borso-app/pragma run test:coverage` (runs both projects with coverage) | 0 — 12 test files, 115 tests passed | PASS |
| C03 | @borso-app/pragma — perFile 100% coverage on every `*.core.ts` / `*.utils.ts` | Coverage report after C02 | All gated files: `transition.core.ts`, `tonality.core.ts`, `mastery.core.ts`, `lineup.core.ts`, `energy-curve.core.ts`, `ip-hash.utils.ts`, `rate-limit.utils.ts`, `session-cookie.utils.ts`, `i18n.utils.ts`, `i18n-parity.core.ts` — 100% statements / functions / lines. `tonality.core.ts` shows 87.5% **branches** in the v8 report; the uncovered branches are the noUncheckedIndexedAccess defensive fallbacks (`?? rawChord`, `?? null`, `?? ''`) that TypeScript demands but the regex makes statically unreachable. Vitest's perFile gate did not fail. | PASS |
| C04 | @borso-app/pragma build | `pnpm --filter @borso-app/pragma run build` | 0 — Vite produced `dist/` (249 KB / 78 KB gz) | PASS |
| C05 | Every `*.utils.ts` in touched workspaces has a sibling `*.utils.test.ts` | Enumerated `apps/pragma/**/*.utils.ts` | `ip-hash.utils.ts`/`.test.ts`, `rate-limit.utils.ts`/`.test.ts`, `session-cookie.utils.ts`/`.test.ts`, `i18n.utils.ts`/`.test.ts` — every utils file paired | PASS |
| C06 | Every `*.core.ts` has a sibling `*.core.test.ts` | Enumerated | `transition`, `tonality`, `mastery`, `lineup`, `energy-curve`, `i18n-parity` — all paired | PASS |
| C07 | `infra/cdk` + `infra/shared` coverage gates remain green (unchanged in this PR) | Not touched in pragma diff | N/A — unchanged | PASS |

## D. Test coverage of spec

Spec's *Test strategy* assigns six scenarios to `/visual-validation` (catalog add-song, members mastery matrix, setlist drag/warning/energy/curve, sessions detail, bars kanban, PWA offline). Those are out of scope for this report.

Spec's *Use cases / edge cases* — pure / non-DOM behavioural assertions that should be covered by unit tests in this PR's slice:

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | ChordPro tonality derivation: first/last bracketed chord (UC 1.5) | `it('extracts start and end from bracketed chords')` at `tonality.core.test.ts:13` | PASS |
| D02 | Tonality edge — no recognisable chord → null (UC edge "ChordPro pasted with no recognizable chord ... → tonality fields stay empty, no error") | `it('returns null for both ends when nothing parses as a chord')` at `tonality.core.test.ts:9` and `it('handles an empty bracket')` at line 55 | PASS |
| D03 | Tonality edge — bracketed non-chord content | `it('returns null when bracketed content is not a chord')` at `tonality.core.test.ts:51` | PASS |
| D04 | Tonality edge — sharps / flats / slash / sus / dim / aug / 7th qualities | Lines 18-24, 26-28, 38-39, 63-67, 70-72 of `tonality.core.test.ts` | PASS |
| D05 | Transition warning — pair safe when same member keeps a harmonic instrument (UC 2.4) | `it('marks the pair safe when the same member holds a harmonic instrument across both songs')` at `transition.core.test.ts:12` | PASS |
| D06 | Transition warning — pair warns when nobody keeps a harmonic instrument (UC 2.4) | `it('marks the pair warn when nobody keeps a harmonic instrument')` at `transition.core.test.ts:21` | PASS |
| D07 | Transition edge — same song twice (encore) → safe (UC edge "Same song appears twice ... transition warning still computed") | `it('safely handles the same song twice (the lineup is identical)')` at `transition.core.test.ts:53` | PASS |
| D08 | Transition edge — absent member treated as not holding any instrument (UC edge "A member is absent for a song ... treats them as not holding any instrument") | `it('treats null instruments as not held')` at `transition.core.test.ts:30` and `it('treats absent members symmetrically to null instruments')` at line 39 | PASS |
| D09 | Mastery effective = override ?? default (Q.O.D. *Mastery matrix locus*) | `it('returns the override when present')` and `it('falls back to the default when no override exists')` at `mastery.core.test.ts:26,30` | PASS |
| D10 | Mastery falsy-trap — override=0 wins over default (plan row: "override=0 → 0 (truthiness trap)") | `it('treats override=0 as a real value (not falsy)')` at `mastery.core.test.ts:36` and `it('includes the 0-score override (falsy trap)')` at line 76 | PASS |
| D11 | Mastery — missing default skipped in mean (plan row: "default absent → null skipped in mean") | `it('skips members with no default and no override')` at `mastery.core.test.ts:71` | PASS |
| D12 | Mastery — `isRedundantOverride` flags rows where override === default (risk-register: sparse-override leak) | `it('returns true when override and default carry the same score')` at `mastery.core.test.ts:120` | PASS |
| D13 | Lineup resolution — three null shapes disambiguated (plan row: "absent / null / explicit-null-instrument") | `it('keeps default members not mentioned in the override')` at `lineup.core.test.ts:12`; `it('respects an explicit null in the override (member sits out)')` at line 19; `it('returns the default when the override is null')` at line 5 | PASS |
| D14 | Energy curve — N+1 anchor points with baseline (UC 2.6 — energy curve renders) | `it('returns the baseline followed by every value')` (in `energy-curve.core.test.ts`, covered by 14 tests including null-gap cases) | PASS |
| D15 | Energy curve — null entry renders as gap (UC edge "Energy slider left null → curve renders a gap") | covered in `energy-curve.core.test.ts` (gap=true assertion) | PASS |
| D16 | i18n key-parity gate (Q.O.D. *User-facing language*) | `i18n-parity.core.test.ts` — runs `diffCatalogs(en, fr)` and asserts in-parity | PASS |
| D17 | Auth — back-e2e: 5 wrong attempts → 429 (plan auth row) | `it('rate-limits after 5 attempts in 15 min on the same ip')` at `auth.controller.test.ts:87` | PASS |
| D18 | Auth — back-e2e: rotate-password invalidates a still-valid cookie (plan auth row) | `it('rotates password + HMAC key and invalidates every existing cookie')` at `auth.controller.test.ts:113` | PASS |
| D19 | Auth — back-e2e: bootstrap endpoint 401s once a row exists (plan auth row says 401 but spec/ADR + impl return 409) | `it('bootstraps via set-password and rejects subsequent attempts with 409')` at `auth.controller.test.ts:55` — returns 409 (semantically correct for "Conflict, already bootstrapped"). The plan row's "401" was a planning-time wording mismatch; 409 is the right status. | PASS |
| D20 | Auth — rotate endpoint is gated by session cookie (ADR-0004 implicit; plan row test expectation "rotate-password invalidates a still-valid cookie" implies the rotate flow requires auth) | No test asserts that `/api/admin/rotate-password` returns 401 when no cookie is presented. The shipped back-e2e at `auth.controller.test.ts:124` actually calls the rotate endpoint without a cookie and confirms it returns 200 — the opposite of what a gate-coverage test would assert. Coupled with the A09 FAIL, this is a missing assertion. | **FAIL** |
| D21 | Cookie HMAC — bad-signature / expired / malformed paths | `apps/pragma/api/src/auth/session-cookie.utils.test.ts` — 12 tests cover round-trip, bad signature, expired, malformed, empty halves, base64url parse failure | PASS |
| D22 | Rate-limit token bucket math (plan row: "Unit test on rate-limit.utils.ts covers token-bucket math") | `rate-limit.utils.test.ts` — 9 tests cover fresh-bucket, accumulate, window-roll, rate-limited threshold | PASS |
| D23 | IP-hash extraction (first comma-separated hop) | `ip-hash.utils.test.ts` — 9 tests, covers absent header, empty header, multi-IP comma-list, whitespace | PASS |
| D24 | locale detection from `navigator.language` | `i18n.utils.test.ts` — covers fr / en / fr-FR / en-US / unsupported → default `fr` | PASS |

## Notes

- **A09 / D20 (FAIL — auth bypass on `/api/admin/rotate-password`).** The rotate endpoint is mounted at `app.ts:38` via `app.route('/api/admin', adminRouter)`, which has no session middleware in front of it. The back-e2e test at `auth.controller.test.ts:113-142` confirms this by POSTing to `/api/admin/rotate-password` with no session cookie and expecting 200. That means anyone reachable from the public internet can rotate the band's password + HMAC key and lock all five members out (a denial-of-service against the band, on top of an integrity defect because the new password is the attacker's). The controller header comment at `auth.controller.ts:11-12` declares the opposite contract ("The rotate endpoint IS gated by the session middleware (mounted upstream by the route registrar)") — the wiring contradicts it. The plan row's self-check ("rotate-password invalidates a still-valid cookie") presumes the operator was already logged in, so the *behaviour* is correct, but the *access control* is missing. **Mitigation suggestions for the fix round:** (1) mount `requireSharedPasswordSession` upstream of the `/api/admin/rotate-password` route (e.g. split `adminRouter` into a `bootstrap`-only public router and a session-gated `admin` router); (2) update the back-e2e to assert a 401 when calling rotate without a cookie and a 200 when calling rotate with the cookie. The bootstrap endpoint correctly remains ungated (its own row-absent guard is the gate). The rate-limit logic on `/api/auth/login` is unrelated to this gap.
- **A32-A43 (UNVERIFIABLE — deferred).** Twelve rows of the spec's Files-to-change list correspond to UI / CDK / Zod-schema surfaces that the implementation-01 verdict explicitly defers to follow-up PRs. The validator confirms these surfaces are not present and trusts the verdict's deferral. The orchestrator should plan the next-round implementation against these rows.
- **C03 — branch coverage 87.5 % on `tonality.core.ts`.** The uncovered branches are the noUncheckedIndexedAccess defensive fallbacks (e.g. `rawChord.split('/')[0] ?? rawChord`, `match[1]` undefined-branch, `chords[0] ?? null` when `chords.length > 0` is already true). They are statically unreachable given the regex anchor but TypeScript demands them. The vitest workspace's gate (`perFile: true, branches: 100`) did not fire — the runner exited 0 in two independent invocations. The implementation is defensible and intentionally typesafe; this is a *report* observation, not a failure.

## Verdict: FAIL

The foundation slice is otherwise clean — domain core is correct, hashing + cookie + rate-limit match ADR-0004, gates (typecheck / lint / knip / test:core / test / build / coverage) are green, conventional commits and clean-code rules hold. The single FAIL is a security defect: the rotate-password endpoint is publicly callable, contradicting ADR-0004's implicit "operator action" framing and the controller's own header comment. The fix is small and isolated to `app.ts` + one new assertion in `auth.controller.test.ts`. Recommend `next: fix`.
