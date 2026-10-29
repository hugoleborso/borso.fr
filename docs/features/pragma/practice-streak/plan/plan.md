# Plan: each member and the band see a practice flame on Home

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

The goal is two flames on Home, a personal one and the band's, computed on read from studies and sessions, and a 20:00 Paris push to each member whose day is still open. The smallest change is one pure domain module for both walks, one `GET /api/streaks`, two header chips and a sheet, one scheduled invocation of the existing API Lambda, and the removal of the old study streak.

## Question settled before implementation

**Q-A. Does a joker bridge a gap that ends yesterday while today is still open?** The spec says "today never breaks the flame" and "a joker bridges only a gap that has an active day on both sides". A gap of yesterday alone has today on its newer side, and today is not active yet.

- **Lenient (recommended).** An open today counts as the newer side. Léa studied every day until the day before yesterday and missed yesterday. Her chip shows 12 with "Today still open", and one joker is spent on yesterday. This fits the happy path, where the chip reads 12 with "Today still open" and "1 joker left this week". It also keeps the 20:00 push "Keep your 12-day flame alive" true. Without it, the push would never reach a member who missed yesterday.
- **Strict.** Her chip shows 0 until she studies today, then jumps to 13 because the gap is now bridged. The 20:00 at-risk push never fires for her.

Settled as **lenient** on 2026-10-29 by the main session, from the spec's ratified happy path. The spec now states the rule.

### Consequence the operator should know (no decision needed, the rules imply it)

A member who stops studying on a Thursday keeps a non-zero flame until the second Friday after it. The walk spends the 3 jokers of the stopping week (Fri, Sat, Sun) and the 3 of the next week (Mon, Tue, Wed). It also skips today, so on the following Thursday the gap Fri to Wed is still bridged. On Friday the gap needs a 4th joker in one week, and the flame ends. A unit test pins this ("keeps the flame of a member who stopped on Thursday until the second Friday").

## Decisions taken in planning

These choices sit inside the spec's frame, so they are decided here rather than sent to the operator.

| # | Decision | Why |
|---|---|---|
| D1 | `paris-day.core.ts` moves from `api/src/studies/` to `apps/pragma/domain/`. Its functions, its test and its `@FollowsBlueprint core-projection` stay the same. | `domain/practice-flame.core.ts` needs `shiftCalendarDay` and `mondayOfWeek`, and `domain/` must not import from `api/` (ADR-0010, `no-restricted-imports`). `api/src/helpers/paris-time/paris-time.core.ts` stays. It has another shape (`{ year, month, day }`) and other callers (free slots, calendar feeds). Unifying the two is not this feature's job (Pattern Coherence pass: the duplication is deliberate and named here). |
| D2 | Naming. **Flame** is the computed count, personal and band. **Streak** names the feature surface: `GET /api/streaks`, the `streaks/` slice, the streak sheet, the `streak` push category and the `streak-reminder` job. | The spec and ADR fix every one of these surface names. VOCABULARY gets a **Flame** entry, and its **Streak** entry is rewritten to point at it. |
| D3 | The walk never spends a joker unless the whole gap is bridged. On a missed day it measures the gap back to the next older active day and counts the jokers each Monday-to-Sunday week needs. It spends them only when every week can pay. Otherwise the walk ends and spends nothing. | This is the spec's "a joker bridges only a gap with an active day on both sides". It also makes `jokersLeftThisWeek` count only jokers that kept the flame alive. |
| D4 | Duplicate pushes are blocked with an insert-only claim on `notification_dispatch` (`hasClaimedFirstDispatch`, now exported). The 10-minute regroup claim (`hasClaimedGroup`) is not used. | `hasClaimedGroup` claims a key again once 10 minutes have passed (`isGroupDue`). A Scheduler or Lambda retry 15 minutes later would push a second time. |
| D5 | The job sends only when the Paris wall hour is 20 or later. Otherwise it logs `streak_reminder_skipped` and returns. The Scheduler target also sets `maxEventAge: Duration.hours(1)` and `retryAttempts: 2`. | A retry after midnight would compute the next day and push "Log a study before midnight" at 00:30. Scheduler keeps the 20:00 time, and this guard only refuses a late retry. |
| D6 | Pushes go out to all members in parallel. Each member's send is bounded by the existing 5 s deadline. | `API_TIMEOUT_SECONDS` is 20 (read in `cdk/lib/stack.ts`). Five sequential 5 s deadlines would be 25 s. |
| D7 | Push text lives in `site/public/sw.js` `NOTIFICATION_TEXT`, the way every other push does, not in `en.json`/`fr.json`. There are three message keys: `streak-at-risk` (`{days}`), `streak-band-count` (`{count}`, count ≥ 2) and `streak-band-count-one`. | The worker renders `messageKey` + `parameters` and has no plural rules. The API picks the singular key itself. |
| D8 | The undo route answers `200 { songId, instrumentId, deleted: true }`, and `POST /api/studies` answers `201 { study }`. Neither carries `myLine`. | The spec drops `myLine`. The `{ …, deleted: true }` shape follows `songs.controller.ts`. |
| D9 | A failed flame read hides the chips and the sheet. The API's request trace already reports a 5xx to Sentry, so the site adds no reporter. | The spec says "logs the error". The server-side report covers a 5xx. A network failure is the same offline state every other Home query has. |
| D10 | The band chip shows the `members` glyph and the count. The flame glyph is on the personal chip only. | This follows the spec's ASCII `[👥 4]`. |
| D11 | The sheet says "No flame yet" whenever a flame is 0. Its member rows are sorted by first name (`getMembersSortedByFirstName`), and the signed-in member is included. | The spec is silent on order. The first-name order is the one the members list already uses. |
| D12 | The dev and test seed (`seedPreviewFixture`) gets a few studies relative to `now`. The first seed member gets the last 5 days except yesterday, and a second member gets today. | Visual validation needs a non-zero flame, a spent joker and a "today counted" state on a fresh dev database. Production holds 0 studies (measured in the spec). |

## Slices

Each slice compiles, passes its own gates and can be committed alone. The order matters. Slice 2 removes API fields the site reads, so it carries that site fallout. Slice 3 adds a push category the settings screen keys a `Record` on, so it carries that label.

| # | Slice | Package gates (all `pnpm --filter @borso-app/pragma …`) |
|---|---|---|
| 1 | Domain rules: move `paris-day`, add `practice-flame.core.ts` | core tests with coverage, scoped Stryker |
| 2 | `GET /api/streaks`, old streak removed, MCP tools report flames, site fallout, VOCABULARY | typecheck, lint, core + touched e2e, scoped Stryker |
| 3 | 20:00 reminder: `streak` category, push text, job, Lambda routing, CDK schedule | typecheck, lint, core (incl. CDK + sw) + touched e2e, scoped Stryker |
| 4 | Home chips, flame glyph, streak sheet, query and invalidation, settings, i18n, seed | typecheck, lint, core, build, visual validation |

### Slice 1: domain rules

**Files**

| File | Change | Blueprint |
|---|---|---|
| `apps/pragma/domain/paris-day.core.ts` (+ `.test.ts`) | `git mv` from `api/src/studies/`. Re-point imports in `studies.repository.ts`, `studies.types.ts`, `studies.service.ts` and `band-streaks.core.ts`/`streak.core.ts` (deleted in slice 2) to `@domain/paris-day.core`. | `core-projection` (kept) |
| `apps/pragma/domain/practice-flame.core.ts` | NEW | `core-decision` |
| `apps/pragma/domain/practice-flame.core.test.ts` | NEW | `test-pure-unit` |

**Data shape**

```ts
// domain/practice-flame.core.ts
import { type CalendarDay } from './paris-day.core';
export const JOKERS_PER_WEEK = 3;
export interface PersonalFlame { readonly days: number; readonly isTodayCounted: boolean; readonly jokersLeftThisWeek: number }
export interface BandFlame { readonly days: number; readonly isTodayCounted: boolean }
export function computePersonalFlame(activeDays: ReadonlySet<CalendarDay>, today: CalendarDay): PersonalFlame;
export function computeBandFlame(activeDays: ReadonlySet<CalendarDay>, today: CalendarDay): BandFlame;
```

The callers pass only days up to and including `today`. A future day in the set is ignored by the walk anyway, because the walk starts at today or yesterday.

**Tests** (titles are the VOCABULARY `Held by` targets)

- counts consecutive active days and marks today counted
- keeps a run ending yesterday alive while today is still open
- bridges a gap that ends yesterday while today is open (Q-A)
- spends one joker per missed day and adds nothing for a bridged day
- bridges a gap that crosses a Monday with each week's own jokers
- ends the flame on a fourth missed day in one week
- spends no joker on missed days older than the first active day
- spends no joker on a gap it cannot bridge whole
- counts jokers left this week from the jokers spent since Monday
- keeps the flame of a member who stopped on Thursday until the second Friday
- returns 0 days and 3 jokers for a member with no activity
- ends the band flame on its first missed day, with no joker
- keeps the band flame alive while today is still open

**Gates**: `pnpm --filter @borso-app/pragma exec vitest run --project core --coverage domain/` (100% per file), then `pnpm --filter @borso-app/pragma exec stryker run --mutate domain/practice-flame.core.ts,domain/paris-day.core.ts` (0 survivors).

### Slice 2: endpoint, old streak removed, MCP

**Files**

| File | Change | Blueprint |
|---|---|---|
| `api/src/streaks/streaks.types.ts` | NEW, `StreaksView`, `MemberFlame` | `domain-types-module` |
| `api/src/streaks/streaks.core.ts` (+ test) | NEW, `buildStreaksView(input)`, `collectSessionDays(sessions, firstDay, today)` and `projectStreaksForTool(view)` | `core-projection` |
| `api/src/streaks/streaks.service.ts` | NEW, `STREAK_LOOKBACK_DAYS = 400` moved here, `readStreaks(memberId, now)` and `readPersonalFlame(memberId, now)` | `service-clock-injected` |
| `api/src/streaks/streaks.controller.ts` | NEW, `buildStreaksRouter()` with `.use('*', requireMemberSession).get('/', …)` | `controller-dispatch` |
| `api/src/streaks/streaks.controller.test.ts` | NEW | `test-back-e2e` |
| `api/src/app.ts` | `.route('/api/streaks', buildStreaksRouter())` inside the one chained expression | (existing `api-composition-root`) |
| `api/src/studies/streak.core.ts`, `band-streaks.core.ts` (+ tests) | DELETE | |
| `api/src/studies/studies.types.ts` | drop `myStreak`, `band`, `BandMemberStreak` and `myLine` from both outcomes | |
| `api/src/studies/studies.service.ts` | drop `readOwnLine`, `buildMemberStreaks` and `computeStreak`. Add passthroughs `listStudyDaysSince(firstDay)` and `listStudyDaysOfMemberSince(memberId, firstDay)`, because the streaks slice reads studies through the service. | `service-passthrough` |
| `api/src/studies/studies.controller.ts` | `201 { study }` and undo `200 { songId, instrumentId, deleted: true }` (D8) | |
| `api/src/studies/study-tool.core.ts` (+ test) | drop `describeStreak`, `describeOwnLine`, `myStreak` and `band` from the projection | |
| `api/src/studies/studies.controller.test.ts` | drop streak assertions. Rename "logs a study once per day and counts it in the streak" to "logs a study once per day". | |
| `api/src/me/me.service.ts` | `readMeForTool` adds `flames: projectStreaksForTool(await readStreaks(...))`. `logOwnStudy` returns `{ flame: await readPersonalFlame(...) }`, and `OwnStudyLine` becomes that type. | |
| `api/src/me/me-tools.controller.ts` | `get_me` routes gain `'GET /api/streaks'`. Its description replaces "your streak and the band's" with "your flame, the band's and each member's". | |
| `site/src/components/molecules/StreakBadge.tsx` | DELETE. Its only caller is the To learn header of `routes/catalog/CatalogPage.tsx` (measured, `grep StreakBadge`), and that block goes. The spec puts no streak outside Home. `BandStreaks.tsx` does not exist (measured). | |
| `site/src/lib/queries/studies.utils.ts` (+ test) | drop `settleOwnLine`, `OwnLine`, `BandRow` and the `myStreak`/`band` generics. `markStudied` stays. | `utils-pure-module` (kept) |
| `site/src/lib/queries/studies.queries.ts` | `onSuccess` of log and undo no longer settles a line. Slice 4 adds the streaks invalidation. | |
| `site/src/i18n/en.json`, `fr.json` | drop `studies.streakDays_*`, `todayCounted`, `todayPending`, `jokerAvailable` and `jokerUsed` | |
| `apps/pragma/VOCABULARY.md` | rewrite **Streak**, add **Flame**, fix the **Study** `Held by` title | |

**Data shapes**

```ts
// streaks.types.ts, the JSON of GET /api/streaks
export interface MemberFlame { readonly memberId: string; readonly firstName: string; readonly color: string; readonly flame: PersonalFlame }
export interface StreaksView { readonly today: CalendarDay; readonly mine: PersonalFlame; readonly band: BandFlame; readonly members: readonly MemberFlame[] }

// streaks.core.ts
interface StreaksInput {
  readonly today: CalendarDay;
  readonly memberId: string;                       // signed-in member
  readonly members: readonly { id: string; firstName: string; color: string }[];
  readonly studies: readonly { memberId: string; studiedOn: CalendarDay }[];
  readonly sessionDays: ReadonlySet<CalendarDay>;   // Paris days of sessions, lookback..today
}
```

`buildStreaksView` forms each member's active set as their study days ∪ `sessionDays`, and the band's as the union over current members ∪ `sessionDays`. A study of a member missing from `members` is ignored, so a deleted member drops out of the band. When the signed-in member is not in `members`, `mine` is the empty flame. `collectSessionDays` maps `parisCalendarDay(session.date)` and keeps days in `[firstLookbackDay, today]`, so a future session counts only once its day comes. The service reads `getSessions(now)`, `getMembersSortedByFirstName()` and `listStudyDaysSince(...)` in one `Promise.all`.

`projectStreaksForTool(view)` returns `{ mine, band, members: [{ firstName, days, isTodayCounted }] }`. Ids and colours are left out because a model pays for every character.

**Tests**

- `streaks.core.test.ts`: union of studies and sessions, band union over members, ignoring a deleted member's study, a future session left out, the empty `mine` for an unknown member, and the tool projection.
- `streaks.controller.test.ts`: 401 without a session. Counts today after `POST /api/studies`, and drops today after the undo. Counts every member's day when a session is dated today. Lists each member with their stored colour.
- `mcp/tool-coverage.test.ts` and `mcp/tool-budget.test.ts` run unchanged and must pass. `get_me` stays within its 2,200-character budget.

**Gates**: `pnpm --filter @borso-app/pragma typecheck`, `pnpm --filter @borso-app/pragma lint`, `pnpm exec oxfmt --check apps/pragma`, `pnpm --filter @borso-app/pragma exec vitest run --project core --coverage`, then `DATABASE_URL=$(scripts/local-postgres.sh start pragma) pnpm --filter @borso-app/pragma exec vitest run --project back-e2e --project back-e2e-assistants api/src/streaks api/src/studies api/src/me api/src/mcp`. After that, `pnpm --filter @borso-app/pragma exec stryker run --mutate api/src/streaks/streaks.core.ts,api/src/studies/study-tool.core.ts,site/src/lib/queries/studies.utils.ts` and `scripts/check-vocabulary-paths.sh`.

### Slice 3: 20:00 reminder job and schedule

**Files**

| File | Change | Blueprint |
|---|---|---|
| `api/src/notifications/notifications.core.ts` (+ test) | `NOTIFICATION_CATEGORIES` gains `'streak'`. `NotificationPayload.messageKey` widens to `NotificationEvent['kind'] \| StreakReminderKey`. | |
| `api/src/notifications/notifications.repository.ts` | export `hasClaimedFirstDispatch` (D4) | |
| `api/src/notifications/notifications.service.ts` | NEW export `readPushAudience(category)`, which returns `{ subscriptions, preferences }`. NEW export `sendPersonalPush({ groupKey, recipients, payload, now, failureName })`, which claims once, sends within the deadline, deletes expired endpoints and reports failures under `failureName`. `reportSendFailures` takes the name, with `PushSendFailed` kept for `notifyBand`. | `service-orchestration` |
| `api/src/streaks/streak-reminder.core.ts` (+ test) | NEW, `selectStreakReminders(input)`, `buildStreakGroupKey(memberId, day)`, `buildStreakPayload(reminder, groupKey)` and `isReminderEvening(parisHour)` | `core-decision` |
| `api/src/streaks/streak-reminder.service.ts` | NEW, `runStreakReminder(now)` | `service-orchestration` |
| `api/src/streaks/streak-reminder.service.test.ts` | NEW, database-backed, with `web-push.adapter` mocked as `notifications.fan-out.test.ts` does | `test-back-e2e` |
| `api/src/helpers/lambda-event/lambda-event.core.ts` (+ test) | NEW, `streakReminderEventSchema = z.object({ job: z.literal('streak-reminder') }).strict()` and `isStreakReminderEvent(event: unknown): event is StreakReminderEvent` | `core-parse-untrusted` |
| `api/src/main.ts` | `export const handler = async (event: LambdaEvent \| StreakReminderEvent, context?) => isStreakReminderEvent(event) ? await runScheduledStreakReminder(new Date()) : await httpHandler(event, context)`. A throw is reported (`reportUnhandledError`), flushed and rethrown, so the Lambda `Errors` alarm in `infra/cdk/src/constructs/lambda-api.ts` fires. | `api-lambda-entrypoint` |
| `api/src/helpers/observability/error-reporting.adapter.ts` (+ test) | NEW export `flushErrorReports()` (`Sentry.flush(FLUSH_TIMEOUT_MILLISECONDS)`) | `adapter-external-service` |
| `site/public/sw.js` | `NOTIFICATION_TEXT.{en,fr}.templates` gain the 3 keys (D7) | |
| `site/src/sw/service-worker.test.ts` | "renders every message key the API sends" lists the 3 new keys in both languages | |
| `site/src/components/organisms/NotificationSettings.tsx` | `CATEGORY_LABEL_KEY.streak`. The `Record<NotificationCategory, …>` makes this a type error until it is added. | |
| `site/src/i18n/en.json`, `fr.json` | `notifications.categories.streak`: "Daily flame reminder at 20:00" / "Rappel de flamme chaque jour à 20 h" | |
| `cdk/lib/stack.ts` | inside `if (isProduction && previewableApp.api !== undefined)`, a `Schedule` with `ScheduleExpression.cron({ minute: '0', hour: '20', timeZone: TimeZone.EUROPE_PARIS })` and the target `new LambdaInvoke(previewableApp.api.handler, { input: ScheduleTargetInput.fromObject({ job: 'streak-reminder' }), maxEventAge: Duration.hours(1), retryAttempts: 2 })`. It imports from `aws-cdk-lib/aws-scheduler` and `aws-cdk-lib/aws-scheduler-targets`, both in aws-cdk-lib 2.272.0 (measured in `apps/pragma/node_modules`). The job's payload string is one exported constant shared by `stack.ts` and `lambda-event.core.ts`, through `domain/scheduled-job.core.ts` (`STREAK_REMINDER_JOB = 'streak-reminder'`, blueprint `core-lookup-table`). That keeps the guard and the schedule from drifting. | `app-cdk-stack` |
| `cdk/test/stack.test.ts` | new `describe('pragma streak reminder schedule (ADR-202610291139)')` | `test-cdk-synth` |

**Data shapes**

```ts
// streak-reminder.core.ts
export type StreakReminderKey = 'streak-at-risk' | 'streak-band-count' | 'streak-band-count-one';
export const AT_RISK_MIN_DAYS = 3;          // "above 2 days"
export const REMINDER_HOUR = 20;
interface ReminderInput {
  readonly today: CalendarDay;
  readonly members: readonly MemberFlame[];
  readonly subscriptions: readonly PushSubscriptionRow[];
  readonly preferences: readonly CategoryPreference[];   // category 'streak'
}
interface StreakReminder { readonly memberId: string; readonly messageKey: StreakReminderKey; readonly parameters: Readonly<Record<string, string>>; readonly recipients: readonly PushSubscriptionRow[] }
// group key: `streak:${memberId}:${today}`; payload url '/'; tag = group key
```

The selection runs per member, in order. A member whose `flame.isTodayCounted` is true gets nothing. A member with `isCategoryEnabled(own prefs, 'streak')` false gets nothing. So does a member with no subscription. A member with `flame.days >= AT_RISK_MIN_DAYS` gets `streak-at-risk` with `{ days }`. Otherwise, when `countedToday >= 1`, the member gets `streak-band-count(-one)` with `{ count }`. Otherwise nothing. `countedToday` is the number of members whose `isTodayCounted` is true.

`runStreakReminder(now)` works in this order:

1. When `isReminderEvening(parisWallTimeOf(now).hour)` is false, it logs `streak_reminder_skipped` and stops.
2. It reads the flames of every member (`readStreaks` minus `mine`) and `readPushAudience('streak')`.
3. It runs `selectStreakReminders`.
4. It calls `Promise.all(sendPersonalPush(..., failureName: 'streak_push_failed'))` (D6).
5. It calls `recordProductEvent({ event: 'streak_reminder_sent', kind, count })`, once per kind with at least one send.

**Tests**

- `streak-reminder.core.test.ts`: at-risk above 2 days. Band count when someone counted. The singular key at count 1. Nothing when nobody counted and the flame is ≤ 2. Nothing for a counted member, a disabled `streak` category or a member with no subscription. The group key format. `isReminderEvening` at 19, 20 and 0.
- `lambda-event.core.test.ts`: accepts `{ job: 'streak-reminder' }`. Refuses an API Gateway or function URL event, a `job` of another name and an extra key. The ADR names this guard test for "both directions".
- `streak-reminder.service.test.ts`: sends one push per open member and claims each group once when run twice. Sends nothing when a session is dated today. Deletes an expired subscription and carries on. Reports `streak_push_failed` and carries on. Sends nothing at 00:30 Paris.
- `stack.test.ts`: on `prod`, one `AWS::Scheduler::Schedule` with `ScheduleExpression: 'cron(0 20 * * ? *)'`, `ScheduleExpressionTimezone: 'Europe/Paris'`, `Target.Input` `{"job":"streak-reminder"}`, `RetryPolicy.MaximumEventAgeInSeconds: 3600`, and a role allowed `lambda:InvokeFunction` on the API function only. On `preview`, no `AWS::Scheduler::Schedule`.
- `error-reporting.adapter.test.ts`: `flushErrorReports` calls `Sentry.flush`.

**Gates**: typecheck, lint, oxfmt as in slice 2. Then `pnpm --filter @borso-app/pragma exec vitest run --project core --coverage` (includes `cdk/test` and `site/src/sw`), and the e2e run on `api/src/streaks api/src/notifications`. Then `pnpm --filter @borso-app/pragma exec stryker run --mutate api/src/streaks/streak-reminder.core.ts,api/src/helpers/lambda-event/lambda-event.core.ts,api/src/notifications/notifications.core.ts,domain/scheduled-job.core.ts,api/src/helpers/observability/error-reporting.adapter.ts`, and finally `pnpm --filter @borso-app/pragma synth`. Synth builds `@borso/infra` and the site first, needs no AWS write and deploys nothing.

### Slice 4: Home chips, sheet and settings

**Files**

| File | Change | Blueprint |
|---|---|---|
| `site/src/components/atoms/Icon.tsx` | `flame` glyph. It is one closed stroke path in the 24 viewBox, so `fill-*` classes fill it. A CSS class wins over the `fill="none"` attribute. | `atom-icon-registry` (kept) |
| `site/src/components/molecules/flame-tone.core.ts` (+ test) | NEW, `selectFlameTone({ days, isTodayCounted }): 'counted' \| 'open' \| 'out'` and `FLAME_TONE_CLASS` (`counted`: `text-accent fill-accent`, `open`: `text-accent fill-accent-soft`, `out`: `text-ink-faint`) | `core-marker-read-off-an-existing-field` |
| `site/src/components/molecules/FlameChip.tsx` (+ `.test.tsx`) | NEW, a `<button type="button">` with `aria-label`, an icon (`flame` or `members`), a tabular count, the tone and `onPress` | `molecule-presentational`, `test-component-render` |
| `site/src/components/organisms/StreakSheet.tsx` (+ `.test.tsx`) | NEW, built on `Sheet`, with props `{ view: StreaksView; onClose }`. Your flame large with the status line and jokers left, then the band flame, one row per member (a dot in `style={{ backgroundColor: member.color }}`, the first name and a compact flame), and a footer `ButtonLink` with icon `catalog` to `/catalog?filter=learning`. | `organism-presentational`, `test-component-render` |
| `site/src/lib/queries/streaks.queries.ts` (+ `.test.tsx`) | NEW, `streakKeys = { all: ['streaks'] as const }` and `useStreaks()` on `api.api.streaks.$get()`. `StreaksView = InferResponseType<…, 200>`. | `query-module`, `test-query-hook` |
| `site/src/lib/queries/studies.queries.ts` | log and undo `onSuccess` call `queryClient.invalidateQueries({ queryKey: streakKeys.all })` | |
| `site/src/routes/home/HomePage.tsx` (+ test) | `useStreaks()`. `PageHeader actions` holds two `FlameChip`s when `data` is defined, and nothing on error or while loading. The sheet open state is local `useState`, and opening it calls `recordProductEvent('streak_sheet_opened')`. | `route-detail-page` (kept) |
| `site/src/observability/product-event.adapter.ts` | `ProductEventName` gains `'streak_sheet_opened'` | |
| `site/src/i18n/en.json`, `fr.json` | `streaks.*` keys, listed below | |
| `api/src/__test/test-seed-fixture.core.ts` (+ test), `test-seed.service.ts` | seed studies relative to `now` (D12) | |
| `apps/pragma/VOCABULARY.md` | **Flame** gains "Shown on Home as two chips that open the streak sheet" | |

**i18n keys** (en / fr, plural with `_one`/`_other`)

- `streaks.mineChip`: "Your flame, {{count}} days, {{status}}" / "Ta flamme, {{count}} jours, {{status}}".
- `streaks.bandChip`: "Band flame, {{count}} days" / "Flamme du groupe, {{count}} jours".
- `streaks.todayCounted`: "today counted" / "aujourd’hui compté".
- `streaks.todayOpen`: "today still open" / "aujourd’hui encore ouvert".
- `streaks.jokersLeft`: "{{count}} jokers left this week" / "{{count}} jokers restants cette semaine".
- `streaks.noFlame`: "No flame yet" / "Pas encore de flamme".
- `streaks.sheetTitle`: "Flames" / "Flammes".
- `streaks.bandTitle`: "Band" / "Groupe".
- `streaks.studyASong`: "Study a song" / "Étudier un morceau".

The status line is two keys rather than string-building, because of `09-i18n.md`.

**Tests**

- `flame-tone.core.test.ts`: covers all three tones.
- `FlameChip.test.tsx`: the accessible name carries the count and the status, and a press calls `onPress`.
- `StreakSheet.test.tsx`: the member rows render with their colour, "No flame yet" shows at 0, the jokers line is pluralised, and the footer link goes to `/catalog?filter=learning`.
- `streaks.queries.test.tsx`: fetches and throws `ApiError` on a non-OK answer. A logged study invalidates `streakKeys.all`.
- `HomePage.test.tsx`: `stubFetch` answers `/api/streaks`. The chips appear on the title line, a tap opens the sheet, and a 500 shows no chip while the rest of Home still renders.

**Gates**: typecheck, lint, oxfmt and core with coverage as before. Then `pnpm --filter @borso-app/pragma build`, `pnpm --filter @borso-app/pragma exec stryker run --mutate site/src/components/molecules/flame-tone.core.ts,api/src/__test/test-seed-fixture.core.ts` and `scripts/check-vocabulary-paths.sh`.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q "What counts" | Studies and sessions (practice or concert). Takes are left out. | `streaks.core.ts` `buildStreaksView` (study days ∪ `collectSessionDays`) | `rg -n "take" apps/pragma/api/src/streaks` returns nothing. The controller test "counts every member's day when a session is dated today" passes. |
| Q "Who" | Personal and band | `StreaksView.mine`, `.band`, `.members` | `streaks.controller.test.ts` asserts all three |
| Q "Period and grace" | Daily, 3 jokers per week personal, none for the band | `domain/practice-flame.core.ts` `JOKERS_PER_WEEK`, `computeBandFlame` | slice 1 tests "ends the flame on a fourth missed day…" and "ends the band flame on its first missed day" |
| Q "Band day" | One member's study, or a session | `buildStreaksView` band union | `streaks.core.test.ts` "band union over members" |
| Q "Joker reset" | Monday to Sunday, Paris | `mondayOfWeek` from `domain/paris-day.core.ts` | test "bridges a gap that crosses a Monday…" |
| Q "Practice without attendance" | A session counts for every member, with no schema change | `sessionDays` added to every member's set | `git diff --stat -- apps/pragma/api/src/database/migrations` is empty |
| Q "Old study streak" | Replace | slice 2 deletions | `rg -n "computeStreak\|buildMemberStreaks\|StreakBadge\|myStreak\|myLine" apps/pragma` returns nothing |
| Q "Pushes" | 20:00 job, production only | `cdk/lib/stack.ts` and `streak-reminder.*` | `stack.test.ts` prod and preview assertions |
| Q "Placement and tap" | Header chips that open a sheet | `HomePage.tsx` `PageHeader actions`, `StreakSheet.tsx` | `HomePage.test.tsx` "chips on the title line, tap opens the sheet" |
| Q "Concerts" | Count, as sessions | `collectSessionDays` reads both kinds | `streaks.core.test.ts` uses a concert-kind session |
| Q "Base branch" | Built on #216's head | (process) branch `claude/ecstatic-rubin-egofk1` | `git merge-base --is-ancestor origin/claude/pragma-ux-redesign-slice-6 HEAD` |
| Rules "Today never breaks" | Walk starts yesterday when today is open | `computePersonalFlame`, `computeBandFlame` | tests "keeps a run ending yesterday alive…" and "keeps the band flame alive while today is still open" |
| Rules "Joker both sides" | D3 and Q-A | `computePersonalFlame` | tests "spends no joker on missed days older than the first active day" and "…a gap it cannot bridge whole" |
| Rules "Jokers left this week" | 3 minus the spent jokers dated ≥ Monday | `computePersonalFlame` | test "counts jokers left this week…" |
| Result "chips" | Two chips on the title line, flame glyph, accent tones | `FlameChip.tsx`, `flame-tone.core.ts`, `Icon.tsx` | `flame-tone.core.test.ts`, then visual validation computed styles |
| Result "accessible name" | "Your flame, 12 days, today counted" | `streaks.mineChip` | `FlameChip.test.tsx` `getByRole('button', { name: … })` |
| Result "sheet" | Your flame, band flame, member rows, `Study a song` | `StreakSheet.tsx` | `StreakSheet.test.tsx` |
| Result "No new primary action" | The Home pill stays | `HomePage.tsx` `BottomActions` untouched | `git diff -- apps/pragma/site/src/routes/home/home.core.ts` is empty |
| Result "Push 20:00" | At-risk above 2 days, else band count | `streak-reminder.core.ts` | core tests |
| Edge "no activity ever" | 0 in `ink-faint`, "No flame yet" | `selectFlameTone` `out`, `StreakSheet` | tests |
| Edge "practice today" | Nobody gets the push | every member `isTodayCounted` | `streak-reminder.service.test.ts` "sends nothing when a session is dated today" |
| Edge "future session" | Counts only on its day | `collectSessionDays` ≤ today | `streaks.core.test.ts` |
| Edge "deleted session / undo" | Gone on the next read | computed on read, with the site invalidating on log and undo | controller test "drops today after the undo", `streaks.queries.test.tsx` |
| Edge "category off" | No push | `isCategoryEnabled(…, 'streak')` | core test |
| Edge "no subscription" | Nothing, and the job carries on | filtered before the claim | core and service tests |
| Edge "deleted member" | Drops out of the sheet and the band | `members` read per call, unknown study ignored | `streaks.core.test.ts` |
| Edge "previews" | No job | prod-only `if` | `stack.test.ts` preview assertion |
| Error "flame read fails" | No chips, Home works | `HomePage.tsx` renders chips only on `data` (D9) | `HomePage.test.tsx` 500 case |
| Error "one push fails" | `streak_push_failed`, carry on, delete expired | `sendPersonalPush(failureName)` | service test |
| Error "job runs twice" | One push per member and day | `hasClaimedFirstDispatch('streak:<id>:<day>')` (D4) | service test "claims each group once when run twice" |
| Changes "Types" | `StreaksView`, `PersonalFlame`, `BandFlame` | `streaks.types.ts`, `practice-flame.core.ts` | typecheck. The site reads the type through `InferResponseType`. |
| Changes "VOCABULARY" | Streak rewritten, Flame added, Study test renamed | `VOCABULARY.md` | `scripts/check-vocabulary-paths.sh` |
| Changes "Database" | None, and `streak` is a text value | `NOTIFICATION_CATEGORIES`, `z.enum` in `notifications.schema.ts` follows | `git status apps/pragma/api/src/database/migrations` is clean |
| Changes "Files" `notifications.core.ts` "two messages" | Three keys, so the singular is right (D7) | `sw.js` | `service-worker.test.ts` |
| Test strategy "visual" | 375 px, phone tap, colours, link, accent after study | `/visual-validation` | gate 6 |
| Analytics `streak_sheet_opened` | product event | `HomePage.tsx` and `ProductEventName` | `HomePage.test.tsx` spies `recordProductEvent` |
| Analytics `streak_reminder_sent` | `{ kind, count }` log line | `streak-reminder.service.ts` | service test reads stdout |
| Zero-defect "alert at 3 a day" | Sentry alert rule | (out of code: a Sentry project setting) | `human:` gate 8 |
| Zero-defect "job throws" | Report, flush, rethrow, then the `Errors` alarm fires | `main.ts`, `flushErrorReports` | `lambda-event.core.test.ts` for routing. The rethrow is read in review. |
| Out of scope | Takes, attendance, other screens, per-member wording | (out of scope) | `StreakBadge` deleted from Catalog |

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| A Scheduler or Lambda retry sends a second push the same evening | high | Insert-only claim per `streak:<member>:<day>` (D4) | `streak-reminder.service.test.ts` "claims each group once when run twice". `notification_dispatch` rows read with `scripts/db-read.sh`. |
| A late retry after midnight pushes "before midnight" at 00:30 | medium | `isReminderEvening` guard and `maxEventAge` of 1 h (D5) | test "sends nothing at 00:30 Paris". `streak_reminder_skipped` in CloudWatch logs. |
| The routing guard sends an HTTP event to the job, or the job to Hono | high | `.strict()` schema with a literal, and the shared constant | `lambda-event.core.test.ts` both directions. An HTTP regression shows in every e2e test, because `main.ts` wraps the same app. |
| The job exceeds the 20 s API timeout | medium | Parallel sends with a 5 s deadline each (D6) | Lambda `Errors` alarm (`lambda-api.ts`). A `Task timed out` log line. |
| A joker walk off-by-one at a Monday or around today | high | One test per rule, the Monday crossing, the Thursday-stop pin, 100% coverage and 0 surviving mutants | Stryker on `practice-flame.core.ts`. The operator's own chip. |
| The operator meant the strict "both sides" reading | medium | Q-A asked before `/implementation`, with the change confined to one branch | Q-A answer recorded in this plan |
| Removing `myStreak`/`myLine` breaks a consumer not found | medium | `rg` sweep in the self-check, and the site types inferred from Hono | `pnpm --filter @borso-app/pragma typecheck` fails on any reader |
| `get_me` grows past its 2,200-character budget | low | Tool projection without ids or colours | `mcp/tool-budget.test.ts` |
| Chips wrap under the title at 375 px | medium | `PageHeader` puts `actions` in a `shrink-0` box next to a `basis-40` title. Two chips of about 64 px fit in 343 px (inferred). | visual validation at 375 px |
| The flame tone uses a token outside the accent family | low | `FLAME_TONE_CLASS` is the only place a tone is spelled | `flame-tone.core.test.ts`. Visual validation computed styles. |
| A stale chip after a study | medium | Log and undo invalidate `streakKeys.all` | `streaks.queries.test.tsx` and visual validation "after a study, accent" |
| The sw cache serves an old `/api/streaks` | low | `/api/streaks` is not in `isReadableApiPath` (measured), so it always goes to the network | `service-worker.test.ts` "leaves a path it does not know to the network" |
| A new push key renders the fallback line | medium | Templates in both languages | `service-worker.test.ts` "renders every message key the API sends" |
| A Scheduler role with broader invoke rights | low | `LambdaInvoke` grants on the target function only | `stack.test.ts` role policy assertion |
| The job never ran end to end before prod (ADR consequence) | medium | Unit, e2e and CDK tests | First 20:00 after merge: `streak_reminder_sent` or `streak_reminder_skipped` in the API log group. A missing line means the schedule did not fire. `human:` gate 9. |
| `infra/cdk` 100% coverage | low | Not touched. The schedule lives in `apps/pragma/cdk`. | `git diff --stat -- infra/` is empty |
| Two calendar-day helpers (`paris-day` and `paris-time`) | low | Named in D1 as deliberate | n/a |

## Code-quality self-check

- [ ] `pnpm --filter @borso-app/pragma lint` clean (oxlint `--type-aware`, including the type-assertion ban, so only `as const` or `as unknown`). `main.ts` narrows with the type predicate, never `as`.
- [ ] `pnpm --filter @borso-app/pragma typecheck` clean.
- [ ] No `any`.
- [ ] No abbreviations or one-letter locals (`member`, not `m`, and `calendarDay`, not `d`).
- [ ] Named constants: `JOKERS_PER_WEEK`, `AT_RISK_MIN_DAYS`, `REMINDER_HOUR`, `STREAK_LOOKBACK_DAYS`, `STREAK_REMINDER_JOB`, the retry count and the event age.
- [ ] Comments say why only (the D4 claim, the D5 guard).
- [ ] Function names describe the result (`computePersonalFlame`, `selectStreakReminders`, `isStreakReminderEvent`).
- [ ] Every new file is marked `// @FollowsBlueprint <id>` as listed in the slice tables.
- [ ] Every pure module is a `.core.ts` with a sibling test at 100% per file and 0 surviving mutants.
- [ ] No cross-app import. `domain/` imports nothing from `api/` or `site/`.
- [ ] Visible text goes through `en.json`/`fr.json`, and push text through `sw.js` templates in both languages.
- [ ] Mobile first. Chip layout classes need no breakpoint at 375 px, and anything wider uses `sm:`.
- [ ] Commits are scoped `pragma`. VOCABULARY lines match the test titles above.

## Pre-flight gates

Run these after slice 4, in order, before the PR goes up. The per-slice gates above run as each slice lands.

1. `pnpm --filter @borso-app/pragma build`.
2. `pnpm --filter @borso-app/pragma exec vitest run --project core --coverage`.
3. `DATABASE_URL=$(scripts/local-postgres.sh start pragma) pnpm --filter @borso-app/pragma exec vitest run --project back-e2e --project back-e2e-assistants api/src/streaks api/src/studies api/src/me api/src/mcp api/src/notifications`.
4. `pnpm --filter @borso-app/pragma exec stryker run --mutate domain/practice-flame.core.ts,domain/paris-day.core.ts,domain/scheduled-job.core.ts,api/src/streaks/streaks.core.ts,api/src/streaks/streak-reminder.core.ts,api/src/helpers/lambda-event/lambda-event.core.ts,api/src/notifications/notifications.core.ts,api/src/studies/study-tool.core.ts,site/src/lib/queries/studies.utils.ts,site/src/components/molecules/flame-tone.core.ts`.
5. `pnpm --filter @borso-app/pragma synth`. The prod template holds one `AWS::Scheduler::Schedule`. Check with `grep -c AWS::Scheduler::Schedule apps/pragma/cdk.out/pragma-prod.template.json` (or the synthesized prod template name `cdk.out` prints).
6. `/visual-validation docs/features/pragma/practice-streak/spec/spec.md`, at 375 px and with `scripts/phone.sh touch` on a chip.
7. `/technical-validation docs/features/pragma/practice-streak/spec/spec.md`.
8. `human:` the operator adds the Sentry alert "`streak_push_failed` ≥ 3 in 24 h" on the pragma project. The spec asks for it, and no alert rule lives in code (measured, `rg PushSendFailed` finds no alert config).
9. `human:` after the merge deploys, the first 20:00 Paris log line `streak_reminder_sent` or `streak_reminder_skipped` in the prod API log group.

## Open questions / unknowns

- **Q-A** is settled as lenient (2026-10-29). The spec states the rule under its personal flame rules.
- Scheduler's invocation mode for a Lambda target (async or sync) is unknown, so whether Lambda's own async retries add to Scheduler's is unknown. D4 and D5 make the outcome the same either way, so this does not block.
- ADR-202610291139 is `proposed`. The main session ratifies it before the PR, and it does not block the plan.

## Missing technical skills

- A CDK skill for app stacks (Scheduler, alarms, the 100% `infra/cdk` gate versus app `cdk/test`).
- A web-push skill (VAPID, the worker template contract, claim-once dispatch, retries).
- A Hono-on-Lambda entry point skill (several event shapes on one handler, Sentry flush outside a request).
