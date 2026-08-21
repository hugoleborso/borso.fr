import { createRuleTester } from './rule-tester.js';
import rule from './pure-functions-live-in-core-files.js';

const serviceFile = 'apps/last-loop-lepin/api/src/punch/punch.service.ts';
const repositoryFile = 'apps/pragma/api/src/songs/songs.repository.ts';
const coreFile = 'apps/last-loop-lepin/api/src/punch/punch.core.ts';
const componentFile = 'apps/pragma/site/src/components/organisms/Leaderboard.tsx';
const testHarnessFile = 'apps/pragma/test/auth-utils.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(serviceFile, { jsx: false }).run('pure-functions-live-in-core-files', rule, {
  valid: [
    'export function toDto(runner: Runner): RunnerDto { return { id: runner.id }; }',
    'export async function record(input: Input) { const existing = await repo.list(); if (existing.length > 3) { return existing[0]; } return repo.insert(input); }',
    'export function stamp(input: Input) { return input.at > 3 ? input.at : new Date(); }',
    'export function readLimit() { return process.env.LIMIT === "high" ? 10 : 20; }',

    'export async function createFrom(input: Input) { return create(input.laps > 3 ? "long" : "short"); }',
    'let cached: Client | null = null; export function getClient() { if (cached !== null && cached.age > 3) { return cached; } cached = build(); return cached; }',
    'let attempts = 0; export function isThrottled(limit: number) { return attempts > limit ? true : false; }',
    "import fs from 'node:fs'; export function readFirst(paths: string[]) { return fs.existsSync(paths[0]) ? paths[0] : paths[1]; }",
    "import { scryptSync } from 'node:crypto'; export function isPinValid(pin: string, salt: Buffer) { return scryptSync(pin, salt, 32).length > 3 ? true : false; }",
    'export function annotate(row: Row, laps: number) { row.rank = laps > 3 ? "finisher" : "running"; return row; }',
    'export function collect(target: string[], laps: number) { target.push(laps > 3 ? "finisher" : "running"); return target; }',
    'export function strip(row: Row, laps: number) { if (laps > 3) { delete row.pending; } return row; }',
    'function readEnv(name: string) { return process.env[name]; } export function readMode(fallback: string) { return readEnv("MODE") === "fast" ? "fast" : fallback; }',
    'function readEnv(name: string) { return process.env[name]; } function readMode() { return readEnv("MODE"); } export function selectTimeout(long: number, short: number) { return readMode() === "fast" ? short : long; }',
    'export function applyTags(scope: IConstruct, laps: number): void { tags.add(laps > 3 ? "long" : "short"); }',
    'export function assertDeployable(stage: Stage): asserts stage is DeployStage { if (stage === "dev") { throw new Error("not deployable"); } }',
    'export async function persist(input: Input): Promise<void> { save(input.laps > 3 ? "long" : "short"); }',
    'export function paint(laps) { if (laps > 3) { canvas.fill("red"); return; } canvas.fill("blue"); }',
    'export function isStage(value: string): value is Stage { return value === "prod" || value === "preview"; }',

    'export function decode(row: Row) { return row.chart === null ? null : JSON.parse(row.chart); }',
    'export function encode(updates: Updates) { const out = {}; if ("title" in updates) { out.title = updates.title; } else { out.title = null; } return out; }',
    'export function parseAll(raw: unknown) { return Array.isArray(raw) ? parseMany(raw) : parseOne(raw); }',
    'export function firstOrNone(rows: Row[]) { return rows.length === 0 ? null : rows[0]; }',
    'export function slugOf(app: string) { if (!PATTERN.test(app)) { throw new Error("bad slug"); } return app.toLowerCase(); }',
    'export function customDomainOf(stage: Stage) { if (stage === "prod") return undefined; return buildDomain(stage); }',
    'export function customDomainOf(stage: Stage) { if (stage === "prod") return null; return buildDomain(stage); }',
    'export function sourceOf(raw: string | null) { return raw === "self" ? "self" : "admin"; }',
    'export function claimOf(subject: Subject) { switch (subject.kind) { case "branch": return `repo:${subject.repo}:branch`; default: return `repo:${subject.repo}:*`; } }',
    'export function nameOf(runner: Runner) { return runner.nickname ?? runner.firstName; }',
    'export function nameOf(runner: Runner) { return runner.nickname || "anonymous"; }',
  ],
  invalid: [
    {
      code: 'export function rankRunner(runner: Runner): string { if (runner.laps > 3) { return "finisher"; } return "running"; }',
      errors: [{ messageId: 'moveToPureFile', data: { name: 'rankRunner' } }],
    },
    {
      code: 'function pickHighest(scores: number[]) { return scores[0] > 3 ? scores.slice(1) : scores.concat(0); }',
      errors: [{ messageId: 'moveToPureFile' }],
    },
    {
      code: 'export function schemaName(context: NameContext): string { switch (context.stage) { case "prod": return "prod"; case "preview": return `pr_${suffixOf(context)}`; } }',
      errors: [{ messageId: 'moveToPureFile' }],
    },
    {
      code: 'export function selectLabel(runner: Runner) { return runner.laps > 3 && runner.status === "live" ? label(runner) : fallback(runner); }',
      errors: [{ messageId: 'moveToPureFile' }],
    },
    {
      code: 'const LIMIT = 3; export function isOver(runner: Runner) { return runner.laps > LIMIT ? "over" : describe(runner); }',
      errors: [{ messageId: 'moveToPureFile', data: { name: 'isOver' } }],
    },
    {
      code: 'function double(value: number) { return value * 2; } export function selectScore(runner: Runner) { return double(runner.laps) > 3 ? double(runner.laps) : score(runner); }',
      errors: [{ messageId: 'moveToPureFile', data: { name: 'selectScore' } }],
    },
    {
      code: 'export function selectPane(window: Pane, laps: number) { return laps > 3 ? window.wide() : window.narrow(); }',
      errors: [{ messageId: 'moveToPureFile', data: { name: 'selectPane' } }],
    },
  ],
});

createRuleTester(repositoryFile, { jsx: false }).run(
  'pure-functions-live-in-core-files (repository)',
  rule,
  {
    valid: [
      'function encodeUpdate(updates: Updates) { const encoded = {}; if ("title" in updates && updates.title !== undefined) encoded.title = updates.title; if ("chart" in updates) { encoded.chart = updates.chart === null ? null : JSON.stringify(updates.chart); } return encoded; }',
    ],
    invalid: [
      {
        code: 'function projectStatus(row: Row) { if (row.laps > row.required) { return "finisher"; } return "running"; }',
        errors: [{ messageId: 'moveToPureFile', data: { name: 'projectStatus' } }],
      },
    ],
  },
);

createRuleTester(componentFile).run('pure-functions-live-in-core-files (front end)', rule, {
  valid: [
    'function Leaderboard({ runners }) { return runners.laps > 3 ? <List /> : <Empty />; }',
    'function useVisibleRunners(runners) { return runners.laps > 3 ? runners.slice(1) : runners.concat(0); }',
    'function readMetaEnv(name: string) { const env = import.meta.env; return env[name].length > 3 ? env[name] : undefined; }',
  ],
  invalid: [
    {
      code: 'function selectVisibleRunners(runners) { return runners.laps > 3 ? runners.slice(1) : runners.concat(0); }',
      errors: [{ messageId: 'moveToPureFile', data: { name: 'selectVisibleRunners' } }],
    },
  ],
});

createRuleTester(coreFile, { jsx: false }).run(
  'pure-functions-live-in-core-files (pure file)',
  rule,
  {
    valid: [
      'export function rankRunner(runner: Runner): string { if (runner.laps > 3) { return "finisher"; } return "running"; }',
    ],
    invalid: [],
  },
);

createRuleTester(testHarnessFile, { jsx: false }).run(
  'pure-functions-live-in-core-files (test harness)',
  rule,
  {
    valid: [
      'export function jsonRequest(path: string, body: unknown) { if (path.length > 3) { return build(path, body); } return build("/", body); }',
    ],
    invalid: [],
  },
);
