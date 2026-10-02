# Plan — The band sees the next two-hour slots when every member is free

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

The work splits into two slices that ship in one pull request: **A**, the database roles in `infra/cdk` and the three `client.ts` files ([ADR-0023](../../../../adr/0023-one-database-role-per-stage-schema.md)); **B**, the pragma feature ([ADR-0024](../../../../adr/0024-calendar-feed-address-in-its-own-table.md), [ADR-0025](../../../../adr/0025-ical-js-parses-calendar-feeds.md)). Slice A lands first in the commit order, so the preview deploy proves it before slice B depends on it.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q.O.D. "Who can read it?" | One role per schema | `infra/cdk/src/internal/migration-runner/database-role.utils.ts` (NEW): `apiRoleName(schemaName)` gives `api_<schema>`; `buildRoleProvisioningStatements(schema, role, principalArns)` gives `CREATE ROLE … WITH LOGIN` (skipped when the role exists), `AWS IAM GRANT <role> TO '<arn>'` per ARN not yet mapped, `GRANT USAGE ON SCHEMA`, and `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA`; `buildRoleRemovalStatements` gives `AWS IAM REVOKE` per mapped ARN, then `DROP ROLE IF EXISTS`. Identifiers go through the existing `assertIdentifier`, and ARNs are checked against an IAM role ARN pattern. | `.utils.ts` at 100 %, mutated |
|  | The runner applies them | `migration-runner/index.ts` UPDATE: `provisionSchema` runs the role statements **after** `applyMigrations`, so tables added by this run are granted. It reads existing mappings from `sys.iam_pg_role_mappings` and existing roles from `pg_roles` first, so a re-run is a no-op. `Delete` runs `dropSchema`, then the role removal. New `ResourceProps.apiPrincipalArns`. | `migration-runner.test.ts` asserts the order and the idempotence |
|  | The construct passes the principals | `dsql-schema.ts` UPDATE: `grantConnect(grantable)` now grants `dsql:DbConnect` (not Admin), records the principal's role ARN in a private list read through `Lazy.list` in the custom resource properties, and adds `grantable.node.addDependency(this.customResource)` so the function deploys after the role exists. New public `apiRoleName`. | `dsql-schema.test.ts`: policy action, dependency edge, properties carry the ARN |
|  | The Lambda knows its role | `lambda-api.ts` UPDATE: adds `DSQL_ROLE: dsqlSchema.apiRoleName` beside `DSQL_ENDPOINT` and `DSQL_SCHEMA`. banana-rush's channel handler gets the same variable in `apps/banana-rush/cdk/lib/stack.ts`. | `lambda-api.test.ts` |
|  | The clients sign as the role | `apps/{pragma,last-loop-lepin,banana-rush}/api/src/database/client.ts` UPDATE: `user` comes from `DSQL_ROLE`, and `password` from `signer.getDbConnectAuthToken()`. `readDsqlConfig` returns `null` without `DSQL_ROLE`, and then `getDatabase` throws its existing "not configured" error rather than falling back to admin. | grep gate below: no `getDbConnectAdminAuthToken` under `apps/*/api` |
| Q.O.D. "How is the address stored?" | Own table, plain text | `apps/pragma/api/src/database/migrations/0015_calendar_feeds.sql` NEW: `member_calendar_feed` and `session.origin`. `calendar-feeds/calendar-feeds.schema.ts` NEW: Drizzle table plus the Zod input `calendarFeedAddressSchema`. | `migrations.audit.test.ts` stays green |
|  | Write-only | `me.controller.ts` UPDATE: `PUT /api/me/calendar-feed` and `DELETE /api/me/calendar-feed`, both answering `{ calendarFeed: 'connected' \| 'absent' }`. `SignedInMember.calendarFeed` is the only read. The repository never selects `address` except in `listFeedAddresses()`, which only `free-slots.service` calls. | back-e2e: no response body contains the stored address |
|  | Deleted with the member | `members.repository.ts` UPDATE: `deleteCalendarFeedOfMember(transaction, id)` inside `deleteMemberWithLinks`. `test-seed.repository.ts` UPDATE: wiped by `deleteAllDomainRows`. | back-e2e |
| Q.O.D. "Does a preview get prod's addresses?" | Blocklisted | `apps/pragma/cdk/lib/stack.ts` UPDATE: `tableBlocklist += 'member_calendar_feed'` | `apps/pragma/cdk/test/stack.test.ts` |
| Q.O.D. SSRF | The guard | `calendar-feeds/feed-address.core.ts` NEW: `normalizeFeedAddress(raw)` turns `webcal:` into `https:`, then rejects anything that is not https, not port 443, an IPv4 or IPv6 literal, `localhost` or a `.localhost` host, or a URL with user info. Used at save time and on every redirect hop. | `.core.ts` at 100 % |
|  | Fetch with limits | `calendar-feeds/calendar-feed.adapter.ts` NEW (`@DependsOnExternal calendar-providers`): `fetch` with `redirect: 'manual'`, at most `MAX_REDIRECTS = 3` hops each re-checked, `AbortSignal.timeout(FEED_TIMEOUT_MS)`, and the body read through a stream reader that stops at `FEED_MAX_BYTES`. It returns `{ kind: 'ok', body }`, `{ kind: 'needs-reconnecting' }` for 401, 403, 404 and 410, or `{ kind: 'unavailable' }` for anything else. The fetcher is injected, as in `deezer.adapter.ts`. | adapter test with a fake fetcher, mutated |
| Q.O.D. ICS parsing | `ical.js` | `calendar-feeds/ics.core.ts` NEW (pure, so a `.core.ts` rather than an adapter: it parses and makes no call): `readBusyIntervals(body, range)`. It parses, expands each `VEVENT` through `ICAL.Event` and its iterator, with exceptions related by `RECURRENCE-ID`, and skips `TRANSP:TRANSPARENT` and `STATUS:CANCELLED`. An all-day event becomes the whole Paris day. A floating time or a `TZID` without a `VTIMEZONE` block is read as Europe/Paris. A parse failure returns `{ kind: 'unavailable' }`. `ical.js` is added to `apps/pragma/package.json` at an exact version. | core test on ICS fixtures, 100 %, mutated |
| Use cases 3 to 5 | Windows, intersection, rounding | `free-slots/free-slots.core.ts` NEW: `buildSearchWindows(now, days)` gives 18:00 to 24:00 on weekdays and 10:00 to 24:00 on weekends, in Paris wall time turned into instants through `Intl.DateTimeFormat` offsets (no time zone library); `subtractBusy(windows, intervals)`; `roundStartUpToQuarterHour`; `keepAtLeast(slots, PRACTICE_DURATION_MINUTES = 120)`. `now` is a parameter. | `.core.ts` at 100 %, both clock changes, crossing midnight, cut at now |
| Use cases 2 and 5, errors | Orchestration | `free-slots/free-slots.service.ts` NEW: reads every member and every feed, fetches the feeds in parallel with `Promise.all` over outcomes (never rejecting), and computes the slots over the included members. It lists excluded members with `no-calendar`, `needs-reconnecting` or `unavailable`, and logs `free_slots_computed` with counts and duration only. `free-slots.controller.ts` NEW: `GET /api/free-slots` behind `requireMemberSession`, mounted in `app.ts`. | controller test, back-e2e |
| Q.O.D. output metric | `session.origin` | `sessions.schema.ts` UPDATE: `origin` column; `practiceCreateSchema` gains `origin: z.enum(['free_slot']).nullable().default(null)`. `sessions.repository.ts` writes it. | `sessions.schema.test.ts` |
| Result, Account page | Calendar section | `site/src/components/organisms/CalendarFeedForm.tsx` NEW (TanStack Form): a single field when `absent`, and "Calendar connected" with Replace and Remove when `connected`. `site/src/lib/queries/me.queries.ts` UPDATE: `useSaveCalendarFeed` and `useRemoveCalendarFeed`, each settling the `me` query from its response, with no refetch. `AccountPage.tsx` UPDATE: renders it. | `/visual-validation` |
| Result, Sessions page | Free-slot block | `site/src/lib/queries/free-slots.queries.ts` NEW (`useFreeSlots`, key `['free-slots']`). `site/src/components/organisms/FreeSlotsPanel.tsx` NEW. `site/src/components/molecules/FreeSlotRow.tsx` NEW. `site/src/lib/free-slots.utils.ts` NEW: formats a slot and the excluded-members sentence. `SessionsPage.tsx` UPDATE: renders the panel. "Book a practice" opens `CreateSessionDialog` with the new optional props `initialDate` and `origin`. The sessions list is invalidated on create, as today. | `.utils.ts` at 100 %, `/visual-validation` |
| Preview fake calendars | Fixture feeds | `__test/calendar-feed-fixtures.core.ts` NEW: `buildFixtureFeed(name, now)` writes ICS bodies relative to `now`. `hugo` has a weekly `RRULE` with an `EXDATE`, `marc` has an all-day busy day plus an all-day transparent one, `sarah` has a cancelled event and a `TZID=America/New_York` event. Together they leave a known first slot at day +2, 19:15 to 23:00 Paris. `test-seed.controller.ts` UPDATE: `GET /calendar-feeds/:name.ics` serves them, `gone.ics` answers 410, and `slow.ics` never answers within the timeout. `test-seed.service.ts` UPDATE: attaches `<origin>/api/__test/calendar-feeds/<name>.ics` to Hugo, Marc and Sarah, and leaves Léa without a calendar. The route exists only behind `ALLOW_TEST_SEED=1`, as today. | `.core.ts` at 100 %, `/visual-validation` |
| Vocabulary | New terms | `apps/pragma/VOCABULARY.md` UPDATE: **calendar feed** (`api/src/calendar-feeds/`), **free slot** (`api/src/free-slots/`), **busy interval**. "availability" and "dispo" go under *Words we do not use*. | `scripts/check-vocabulary-paths.sh` |
| Out of scope | Writes to calendars, invitations, reminders, other durations, member subsets, declined invitations, sessions crossing midnight | (out of scope) | — |

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| A DSQL statement the docs show does not behave as written: `GRANT … ON ALL TABLES IN SCHEMA`, `DROP ROLE`, or reading `sys.iam_pg_role_mappings` as admin | high | Each statement runs in its own call, as the runner already does for DDL. A failure aborts the custom resource, which rolls the stack back with the old Lambda still on admin. | The PR preview deploy fails at the schema resource, before any merge. This session cannot write to AWS, so the preview is the first real test. |
| The Lambda takes traffic before its role exists | high | `addDependency` from the function onto the schema custom resource | `dsql-schema.test.ts` asserts the `DependsOn` edge in the template |
| Production cutover: all three apps switch identity on the same merge | high | Previews and integ run the same code path first. If the deploy fails, CloudFormation rolls back and the old function keeps `DbConnectAdmin`. | The `Errors` alarm on each `LambdaApi`, and the deploy workflow's own status |
| A table created by a future migration is not granted | medium | Grants run after every migration run, not once | back-e2e cannot see DSQL; the next preview deploy would return 5xx on the new table |
| The address leaks through a response, a log or a validation error | high | Response types carry no `address`; the controller returns a fixed `{ error: 'invalid-feed-address' }` instead of the Zod issues; the adapter logs outcomes, never URLs; Hono's `logger()` logs paths, and no path carries the address | back-e2e asserts on every route the feature adds that no body contains the address, plus a test that the 400 body is fixed |
| SSRF reaching the Lambda runtime API or another internal host | high | https on 443 only, no IP literal, no `localhost`, each redirect re-checked. The Lambda is outside any VPC, and the runtime API listens on a loopback port other than 443. | `feed-address.core.test.ts` table; adapter test with a redirect to `http://127.0.0.1:9001` |
| A wrong recurrence or zone proposes a slot when a member is busy | high | `ical.js`; fixtures for `RRULE`, `EXDATE`, `RECURRENCE-ID`, a foreign `TZID`, all-day, transparent, cancelled | adapter tests; visual validation on the known first slot |
| Paris clock changes shift the windows by an hour | medium | Offsets come from `Intl` per instant, not a fixed `+01:00` | core tests on 2026-10-25 and 2027-03-28 |
| A slow provider makes the page slow | medium | A time limit per feed, all feeds fetched in parallel, and a failed feed excludes only that member | `free_slots_computed.duration` in the logs; the `slow.ics` fixture in visual validation |
| The `infra/cdk` 100 % coverage gate fails on the new branches | medium | Every new branch in `index.ts` and `dsql-schema.ts` has a test; pure builders sit in `.utils.ts` | `pnpm --filter @borso/infra test:coverage` in pre-flight |
| The `borso-shared` template moves | low | Nothing in `infra/shared` changes | the snapshot test; if it moves, the merge owes a `shared-deploy` dispatch |
| knip flags `ical.js` or an unused export | low | One importer, the adapter | `pnpm exec knip` |

## Code-quality self-check

- [ ] Repo lint rules pass (`pnpm exec eslint --no-warn-ignored --max-warnings 0`).
- [ ] Type-assertion plugin satisfied (only `as const`, `as unknown` allowed in this repo).
- [ ] No `any`.
- [ ] No abbreviations or single-letter locals outside trivial loop indices.
- [ ] Magic numbers / strings extracted to named constants (`FEED_TIMEOUT_MS`, `FEED_MAX_BYTES`, `MAX_REDIRECTS`, `PRACTICE_DURATION_MINUTES`, `SEARCH_DAYS = 28`, window hours, `QUARTER_HOUR_MINUTES`).
- [ ] No comments in code; only the machine-read annotations (`@FollowsBlueprint`, `@DependsOnExternal`, `@Feature`).
- [ ] Every new file follows the blueprint of its layer, read from `.claude/skills/blueprint/blueprint-index.md` after `scripts/reports.sh blueprints`.
- [ ] No `useEffect`; server state through TanStack Query; the form through TanStack Form; every user-facing string in `en.json` and `fr.json`.
- [ ] Layout classes carry `sm:`/`lg:` variants; checked at 375 px and 1280 px.
- [ ] Function names describe the result, not the mechanism.

## Pre-flight gates

Run, in order, before push:
1. `pnpm install`.
2. `pnpm --filter @borso/infra build && pnpm --filter @borso/infra test:coverage` (100 % gate).
3. `pnpm --filter @borso-app/{pragma,last-loop-lepin,banana-rush} typecheck`.
4. `pnpm exec eslint --no-warn-ignored --max-warnings 0` on the changed files.
5. `pnpm --filter @borso-app/pragma test:coverage` (core plus back-e2e on local Postgres), and `test:core` plus `test` for last-loop-lepin and banana-rush.
6. `grep -rn getDbConnectAdminAuthToken apps/*/api/src` returns nothing.
7. `pnpm --filter @borso-app/pragma build`, then the CDK synth tests of the three apps.
8. `pnpm exec knip`.
9. `/technical-validation` against the spec.
10. After the push: the PR preview deploys green, then `/visual-validation` runs against the preview URL after `POST /api/__test/seed`.

## Open questions / unknowns

- Whether DSQL accepts `GRANT … ON ALL TABLES IN SCHEMA` and `DROP ROLE` exactly as Postgres does is only answered by the first preview deploy. If one is refused, the fallback is a `GRANT` per table listed from `information_schema.tables`, which the builder can emit just as well.
- A preview schema is dropped on PR close. Previews created **before** this change have no role, and their `Delete` must tolerate that, so the removal uses `IF EXISTS` and skips the revoke when no mapping exists.
- Whether an integ stage cuts over cleanly. It runs the same custom resource, so it gets the same answer as the previews.

## Missing technical skills

- None of `/database` or `/controller` exist under `.claude/skills/`. This plan wrote the Drizzle, DSQL-role and Hono slices itself.
