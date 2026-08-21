import { createRuleTester } from './rule-tester.js';
import rule from './conditions-live-in-pure-functions.js';

const serviceFile = 'apps/last-loop-lepin/api/src/punch/punch.service.ts';
const controllerFile = 'apps/last-loop-lepin/api/src/punch/punch.controller.ts';
const repositoryFile = 'apps/pragma/api/src/songs/songs.repository.ts';
const coreFile = 'apps/last-loop-lepin/api/src/punch/punch.core.ts';
const componentFile = 'apps/pragma/site/src/components/organisms/Leaderboard.tsx';

// @FollowsBlueprint test-lint-rule
createRuleTester(serviceFile, { jsx: false }).run('conditions-live-in-pure-functions', rule, {
  valid: [
    'const decision = decidePunchAcceptance(punches, input, edition, now); return insert(decision.punch);',

    'const punch = row === null ? null : rowToPunch(row);',
    'const punch = row === undefined ? null : rowToPunch(row);',
    'const punch = row == null ? null : rowToPunch(row);',
    'const punch = null === row ? null : rowToPunch(row);',
    'function encode(row: Row) { if (row.chart !== null) { encoded.chart = JSON.stringify(row.chart); } else { encoded.chart = null; } }',
    'const source = Array.isArray(raw) ? parseMany(raw) : parseOne(raw);',
    'const label = typeof value === "string" ? trim(value) : describe(value);',
    'const message = error instanceof AuthDeniedError ? error.message : describe(error);',
    'function encode(updates: Updates) { if ("title" in updates) { encoded.title = normalise(updates.title); } else { encoded.title = fallback(); } }',
    'function encode(updates: Updates) { if ("title" in updates && updates.title !== undefined) { encoded.title = normalise(updates.title); } else { drop(); } }',
    'const punch = row?.chart === null ? null : rowToPunch(row);',
    'const punch = row!.chart === undefined ? null : rowToPunch(row);',

    'const parsed = rows.length === 0 ? loadBundled() : parseRows(rows);',
    'const parsed = 0 === rows.length ? loadBundled() : parseRows(rows);',
    'const parsed = listeners.size > 0 ? notifyAll(listeners) : sleep();',

    'const capo = next === "" ? null : Number(next);',
    'const capo = "" === next ? null : Number(next);',
    'const capacity = value.capacity !== "" ? Number(value.capacity) : 0;',

    'const titleText = isConcert ? (session.venue ?? formattedDate) : t("sessions.kindPractice");',
    'const titleText = !isConcert ? t("sessions.kindPractice") : (session.venue ?? formattedDate);',
    'function read(isAdmin: boolean) { if (isAdmin) { return readAll(); } else { return readOwn(); } }',

    'const apiDomainName = props.customDomain ? buildApiDomain(props.customDomain) : undefined;',
    'const environment = { ...(props.dsqlSchema ? { SCHEMA: props.dsqlSchema.name } : {}) };',
    'function attach(props: Props) { if (props.customDomain && apiDomainName) { addMapping(props.customDomain, apiDomainName); } }',

    'const options = props.allowedOrigins && props.allowedOrigins.length > 0 ? buildCors(props.allowedOrigins) : undefined;',
    'const panel = isConcert && !editingConcert ? renderConcert(session) : null;',

    'function get(id: string) { if (id === null) { throw new NotFoundError(); } return load(id); }',
    'function get(id: string) { if (id === null) throw new NotFoundError(); return load(id); }',
    'function get(id: string) { if (cache.has(id)) { return cache.get(id); } return load(id); }',
    'function rank(runner: Runner) { if (runner.laps > runner.required) return "finisher"; return "running"; }',

    'function mount() { if (rootElement) { createRoot(rootElement).render(tree); } }',
    'function mount() { if (this.enabled) { start(); } }',

    'const status = error.reason === "rate-limited" ? 429 : 401;',
    'const capped = count > 0 ? count : 0;',
    'const offset = shifted ? -1 : 0;',
    'const name = renamed ? runner.nickname : runner.firstName;',
    'const slug = isProd ? `${APP_SLUG}-prod` : `${APP_SLUG}-preview`;',
    'const title = isConcert ? t("sessions.concert") : t("sessions.practice");',

    'function score(status: Status) { switch (status) { case "dnf": return 1; default: return 0; } }',
    'function score(status: Status) { switch (status) { case "dnf": case "dns": return 1; default: return 0; } }',
    'function score(status: Status) { switch (status) { case "dnf": { return 1; } default: { return 0; } } }',
    'function score(status: Status) { switch (status) { case "dnf": return; default: return; } }',

    'const limit = requested ?? DEFAULT_LIMIT;',
    'const label = runner.nickname || runner.firstName;',
    'const ready = loaded && parsed;',
  ],
  invalid: [
    {
      code: 'function apply(runner: Runner) { if (runner.status === "dnf") { markDidNotFinish(runner); } else { markFinished(runner); } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const verdict = punches.length > MAX_PUNCHES ? reject(punches) : accept(punches);',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'function apply(count: number) { if (count === 0) { skip(); } else { run(count); } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const parsed = rows["length"] === 0 ? loadBundled() : parseRows(rows);',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const capo = next === "0" ? null : Number(next);',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'function check(origin: string) { if (!allowed.includes(origin)) { reject(origin); } else { accept(origin); } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'function apply(status: Status) { if (status === "dnf") { logDidNotFinish(status); return; } run(); }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'function read(role: Role) { if (role.level > ADMIN_LEVEL) { return readAll(); } else { return readOwn(); } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const status = error.reason === "rate-limited" ? 429 : error.reason === "misconfigured" ? 500 : 401;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const label = session.kind === "concert" ? t("sessions.concert") : formatPractice(session);',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const label = session.kind === "concert" ? t("sessions.concert") : t(buildKey(session));',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const label = session.kind === "concert" ? t?.("sessions.concert") : t?.("sessions.practice");',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const flag = mode === "strict" ? !enabled : enabled;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const label = mode === "strict" ? `${describe(runner)}` : "plain";',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'function score(status: Status) { switch (status) { case "dnf": notifyJury(status); return 1; default: return 0; } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'function score(runner: Runner) { switch (runner.status) { case "dnf": return computePenalty(runner); default: return 0; } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'function score(status: Status) { switch (status) { case "dnf": penalty = 1; default: return 0; } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
  ],
});

createRuleTester(controllerFile, { jsx: false }).run(
  'conditions-live-in-pure-functions (controller)',
  rule,
  {
    valid: [
      'async function handler(context) { const runner = await service.find(id); if (runner === null) { return context.json({ error: "not found" }, 404); } return context.json(runner); }',
      'async function handler(context) { if (isAdmin) { return context.json(all); } else { return context.json(some); } }',
    ],
    invalid: [
      {
        code: 'async function handler(context) { if (context.get("role") === "admin") { return context.json(all); } else { return context.json(some); } }',
        errors: [{ messageId: 'moveToPureFunction' }],
      },
    ],
  },
);

createRuleTester(repositoryFile, { jsx: false }).run(
  'conditions-live-in-pure-functions (repository shape handling)',
  rule,
  {
    valid: [
      'function parseColumn(raw: string | null) { if (raw === null) return []; return schema.parse(JSON.parse(raw)); }',
      'const chartRaw: unknown = row.chart === null ? null : JSON.parse(row.chart);',
      'const chart = chartRaw === null ? null : chordChartSchema.parse(chartRaw);',
      'function encode(updates: Updates) { if ("title" in updates && updates.title !== undefined) encoded.title = updates.title; }',
      'function encode(updates: Updates) { if ("links" in updates) encoded.links = JSON.stringify(updates.links ?? []); }',
    ],
    invalid: [],
  },
);

createRuleTester('infra/cdk/test/unit/helpers/migration-runner-mock.ts', { jsx: false }).run(
  'conditions-live-in-pure-functions (test harness helper)',
  rule,
  {
    valid: [
      'const rows = state.existingSchemas.has(probedSchema) ? [{ count: 1 }] : [];',
      'function apply(query: string) { if (query.includes("INSERT INTO")) { record(query); } else { ignore(query); } }',
    ],
    invalid: [],
  },
);

createRuleTester(coreFile, { jsx: false }).run(
  'conditions-live-in-pure-functions (pure file)',
  rule,
  {
    valid: [
      'export function rank(runner: Runner) { if (runner.laps > 3) { count(runner); } else { drop(runner); } }',
      'export const label = (runner: Runner) => (runner.status === "dnf" ? describe(runner) : name(runner));',
    ],
    invalid: [],
  },
);

createRuleTester(componentFile).run('conditions-live-in-pure-functions (component)', rule, {
  valid: [
    'const Row = () => <span className={rowClassName}>{label}</span>;',
    'const Badge = BADGE_BY_KIND[selectRunnerBadgeKind(runner, edition)];',
    'const Row = () => <span>{error === null ? null : <Alert message={error} />}</span>;',
    'const Row = () => <span>{crumb !== undefined && crumb !== null && <Crumb>{crumb}</Crumb>}</span>;',
    'const Row = () => <span>{hits.length === 0 ? null : <Hits hits={hits} />}</span>;',
    'const Row = () => <span className={clsx(isActive && "bg-accent", canSort && "cursor-pointer")} />;',
    'const Row = () => <span className={isActive ? "bg-accent" : "bg-transparent"} />;',
    'const Row = () => <span>{isBusy ? t("catalog.uploading") : t("catalog.uploadPrompt")}</span>;',

    'const Row = () => <span>{moreOpen ? <MoreMenu entry={entry} /> : null}</span>;',
    'const Row = () => <span>{isBusy && <Spinner />}</span>;',
    'const Row = () => <span>{isBusy ? t("catalog.uploading") : describeUpload(upload)}</span>;',

    'const Row = () => <span>{props.hasOverride ? <OverrideBadge entry={props.entry} /> : null}</span>;',
    'const Row = () => <span>{props.showTransitionWarningBefore ? <TransitionWarning gap={props.gap} /> : null}</span>;',
    'const Row = () => <span>{props.canEdit && <EditButton onClick={props.onEdit} />}</span>;',
    'const Row = () => <span>{props.entry.isStale && <StaleBadge entry={props.entry} />}</span>;',
    'const Row = () => <span>{props.shouldWarn || props.wasSkipped ? <Warning entry={entry} /> : null}</span>;',

    'const Row = () => <span>{isConcert && session.capacity !== null ? <Seats session={session} /> : null}</span>;',
    'const Row = () => <span>{isConcert && !editingConcert ? <ConcertPanel session={session} /> : null}</span>;',
  ],
  invalid: [
    {
      code: 'const Row = () => <span>{runner.finished && <Medal />}</span>;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const Row = () => <span>{layer.canvas && <Overlay layer={layer} />}</span>;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const Row = () => <span>{flags["isStale"] && <StaleBadge entry={entry} />}</span>;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const Row = () => <span>{runner.status === "finished" ? <Medal /> : <Runner />}</span>;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const Row = () => <span>{runner.laps > edition.requiredLaps && <Medal />}</span>;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const Row = () => <span>{isConcert && friendsTotal > 0 ? <Friends session={session} /> : null}</span>;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const Row = () => <span>{upload.state === "busy" ? t("catalog.uploading") : describeUpload(upload)}</span>;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
  ],
});
