import { createRuleTester } from './rule-tester.js';
import rule from './conditions-live-in-pure-functions.js';

const serviceFile = 'apps/last-loop-lepin/api/src/punch/punch.service.ts';
const controllerFile = 'apps/last-loop-lepin/api/src/punch/punch.controller.ts';
const repositoryFile = 'apps/pragma/api/src/songs/songs.repository.ts';
const coreFile = 'apps/last-loop-lepin/api/src/punch/punch.core.ts';
const componentFile = 'apps/pragma/site/src/components/organisms/Leaderboard.tsx';

createRuleTester(serviceFile, { jsx: false }).run('conditions-live-in-pure-functions', rule, {
  valid: [
    // The decision moved out, so the service is a straight line.
    'const decision = decidePunchAcceptance(punches, input, edition, now); return insert(decision.punch);',

    // Shape tests, which ask whether a value is there rather than what it means.
    'const punch = row === null ? null : rowToPunch(row);',
    'const punch = row === undefined ? null : rowToPunch(row);',
    'const punch = row == null ? null : rowToPunch(row);',
    'const punch = null === row ? null : rowToPunch(row);',
    'function encode(row: Row) { if (row.chart !== null) { encoded.chart = JSON.stringify(row.chart); } else { encoded.chart = null; } }',
    'const source = Array.isArray(raw) ? parseMany(raw) : parseOne(raw);',
    'const label = typeof value === "string" ? trim(value) : describe(value);',
    'const message = error instanceof AuthDeniedError ? error.message : describe(error);',
    'function encode(updates: Updates) { if ("title" in updates) { encoded.title = normalise(updates.title); } else { encoded.title = fallback(); } }',
    // One presence test written twice.
    'function encode(updates: Updates) { if ("title" in updates && updates.title !== undefined) { encoded.title = normalise(updates.title); } else { drop(); } }',
    // The optional chain and the non-null assertion carry no decision of their own.
    'const punch = row?.chart === null ? null : rowToPunch(row);',
    'const punch = row!.chart === undefined ? null : rowToPunch(row);',

    // An empty collection is an absent value written the way JavaScript writes it.
    'const parsed = rows.length === 0 ? loadBundled() : parseRows(rows);',
    'const parsed = 0 === rows.length ? loadBundled() : parseRows(rows);',
    'const parsed = listeners.size > 0 ? notifyAll(listeners) : sleep();',

    // A guard clause is a guard clause wherever it appears, including a service.
    'function get(id: string) { if (id === null) { throw new NotFoundError(); } return load(id); }',
    'function get(id: string) { if (id === null) throw new NotFoundError(); return load(id); }',
    'function get(id: string) { if (cache.has(id)) { return cache.get(id); } return load(id); }',
    'function rank(runner: Runner) { if (runner.laps > runner.required) return "finisher"; return "running"; }',

    // An `if` with no `else` makes no choice, it either acts or it does not.
    'function mount() { if (rootElement) { createRoot(rootElement).render(tree); } }',
    'function mount() { if (this.enabled) { start(); } }',

    // A choice between two plain values decides nothing.
    'const status = error.reason === "rate-limited" ? 429 : 401;',
    'const capped = count > 0 ? count : 0;',
    'const offset = shifted ? -1 : 0;',
    'const name = renamed ? runner.nickname : runner.firstName;',
    'const slug = isProd ? `${APP_SLUG}-prod` : `${APP_SLUG}-preview`;',
    // Two calls to the same function with plain arguments are still two constants.
    'const title = isConcert ? t("sessions.concert") : t("sessions.practice");',

    // A switch used as a lookup table.
    'function score(status: Status) { switch (status) { case "dnf": return 1; default: return 0; } }',
    'function score(status: Status) { switch (status) { case "dnf": case "dns": return 1; default: return 0; } }',
    'function score(status: Status) { switch (status) { case "dnf": { return 1; } default: { return 0; } } }',
    'function score(status: Status) { switch (status) { case "dnf": return; default: return; } }',

    // `??` combines values, and a logical expression outside JSX does too.
    'const limit = requested ?? DEFAULT_LIMIT;',
    'const label = runner.nickname || runner.firstName;',
    'const ready = loaded && parsed;',
  ],
  invalid: [
    // A domain comparison that picks a different behaviour per branch.
    {
      code: 'function apply(runner: Runner) { if (runner.status === "dnf") { markDidNotFinish(runner); } else { markFinished(runner); } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // A threshold, which is not an emptiness test even though it reads `.length`.
    {
      code: 'const verdict = punches.length > MAX_PUNCHES ? reject(punches) : accept(punches);',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // `0` on its own is not an emptiness test, because nothing reads `.length`.
    {
      code: 'function apply(count: number) { if (count === 0) { skip(); } else { run(count); } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // `.length` reached through a computed key is not the emptiness idiom.
    {
      code: 'const parsed = rows["length"] === 0 ? loadBundled() : parseRows(rows);',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // `!` in front of a call is a membership test, not a presence test.
    {
      code: 'function check(origin: string) { if (!allowed.includes(origin)) { reject(origin); } else { accept(origin); } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // A guard clause is one statement, so a second statement makes it a branch.
    {
      code: 'function apply(status: Status) { if (status === "dnf") { logDidNotFinish(status); return; } run(); }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // An `else` means a choice is being made, so the bare flag stops being a presence test.
    {
      code: 'function read(isAdmin: boolean) { if (isAdmin) { return readAll(); } else { return readOwn(); } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // The outer ternary chooses between a literal and another decision.
    {
      code: 'const status = error.reason === "rate-limited" ? 429 : error.reason === "misconfigured" ? 500 : 401;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // Two calls, but not to the same function.
    {
      code: 'const label = isConcert ? t("sessions.concert") : formatPractice(session);',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // Same function, but an argument that is worked out rather than written down.
    {
      code: 'const label = isConcert ? t("sessions.concert") : t(buildKey(session));',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // An optional call is not treated as the same call.
    {
      code: 'const label = isConcert ? t?.("sessions.concert") : t?.("sessions.practice");',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // A negated branch value is worked out, so the two sides are not plain.
    {
      code: 'const flag = mode === "strict" ? !enabled : enabled;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // A template literal that interpolates a call is worked out too.
    {
      code: 'const label = mode === "strict" ? `${describe(runner)}` : "plain";',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // A switch that does work in a case is not a lookup table.
    {
      code: 'function score(status: Status) { switch (status) { case "dnf": notifyJury(status); return 1; default: return 0; } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // A switch whose case computes its answer is not a lookup table either.
    {
      code: 'function score(runner: Runner) { switch (runner.status) { case "dnf": return computePenalty(runner); default: return 0; } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    // A case that assigns rather than returns is not a lookup table.
    {
      code: 'function score(status: Status) { switch (status) { case "dnf": penalty = 1; default: return 0; } }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
  ],
});

// The return guard used to be a controller-only exemption, and the controller
// still behaves the same way now that every file gets it.
createRuleTester(controllerFile, { jsx: false }).run(
  'conditions-live-in-pure-functions (controller)',
  rule,
  {
    valid: [
      'async function handler(context) { const runner = await service.find(id); if (runner === null) { return context.json({ error: "not found" }, 404); } return context.json(runner); }',
    ],
    invalid: [
      {
        code: 'async function handler(context) { if (isAdmin) { return context.json(all); } else { return context.json(some); } }',
        errors: [{ messageId: 'moveToPureFunction' }],
      },
    ],
  },
);

// The row encoding a repository does is shape handling, and extracting it would
// buy a pile of one line functions and tests that assert the obvious.
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

// A pure file is where the decisions are supposed to be.
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
    // Composition through a lookup rather than a branch.
    'const Badge = BADGE_BY_KIND[selectRunnerBadgeKind(runner, edition)];',
    // Shape tests, including the conjunction form React code writes constantly.
    'const Row = () => <span>{error === null ? null : <Alert message={error} />}</span>;',
    'const Row = () => <span>{crumb !== undefined && crumb !== null && <Crumb>{crumb}</Crumb>}</span>;',
    'const Row = () => <span>{hits.length === 0 ? null : <Hits hits={hits} />}</span>;',
    // Picking a class name is presentation.
    'const Row = () => <span className={clsx(isActive && "bg-accent", canSort && "cursor-pointer")} />;',
    'const Row = () => <span className={isActive ? "bg-accent" : "bg-transparent"} />;',
    // Picking a translation key is presentation too.
    'const Row = () => <span>{isBusy ? t("catalog.uploading") : t("catalog.uploadPrompt")}</span>;',
  ],
  invalid: [
    {
      code: 'const Row = () => <span>{runner.finished && <Medal />}</span>;',
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
      code: 'const Row = () => <span>{isBusy ? t("catalog.uploading") : describeUpload(upload)}</span>;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
  ],
});
