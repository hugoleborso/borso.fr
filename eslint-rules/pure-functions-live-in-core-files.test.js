import { createRuleTester } from './rule-tester.js';
import rule from './pure-functions-live-in-core-files.js';

const serviceFile = 'apps/last-loop-lepin/api/src/punch/punch.service.ts';
const coreFile = 'apps/last-loop-lepin/api/src/punch/punch.core.ts';
const componentFile = 'apps/pragma/site/src/components/organisms/Leaderboard.tsx';

createRuleTester(serviceFile, { jsx: false }).run('pure-functions-live-in-core-files', rule, {
  valid: [
    // No branch, so nothing to extract.
    'export function toDto(runner: Runner): RunnerDto { return { id: runner.id }; }',
    // Awaits, so it is orchestration and belongs in the service.
    'export async function record(input: Input) { const existing = await repo.list(); if (existing.length > 0) { return existing[0]; } return repo.insert(input); }',
    // Reads the clock, so it is impure.
    'export function stamp(input: Input) { return input.at ? input.at : new Date(); }',
    // Reads an impure global.
    'export function readLimit() { return process.env.LIMIT ? 10 : 20; }',
  ],
  invalid: [
    {
      code: 'export function rankRunner(runner: Runner): string { if (runner.laps > 3) { return "finisher"; } return "running"; }',
      errors: [{ messageId: 'moveToPureFile', data: { name: 'rankRunner' } }],
    },
    {
      code: 'const selectLabel = (runner: Runner) => (runner.finished ? "done" : "running");',
      errors: [{ messageId: 'moveToPureFile' }],
    },
    {
      code: 'function pickHighest(scores: number[]) { return scores.length > 0 ? scores[0] : 0; }',
      errors: [{ messageId: 'moveToPureFile' }],
    },
  ],
});

createRuleTester(componentFile).run('pure-functions-live-in-core-files (front end)', rule, {
  valid: [
    // A component returns a tree, so it is not a pure helper.
    'function Leaderboard({ runners }) { return runners.length > 0 ? <List /> : <Empty />; }',
    // A hook reads render state.
    'function useVisibleRunners(runners) { return runners.length > 0 ? runners : []; }',
  ],
  invalid: [
    {
      code: 'function selectVisibleRunners(runners) { return runners.length > 0 ? runners : []; }',
      errors: [{ messageId: 'moveToPureFile', data: { name: 'selectVisibleRunners' } }],
    },
  ],
});

// A pure file is exactly where these belong, so the rule stays silent.
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
