import { createRuleTester } from './rule-tester.js';
import rule from './no-impure-calls-in-core-files.js';

const coreFile = 'apps/last-loop-lepin/api/src/punch/punch.core.ts';
const serviceFile = 'apps/last-loop-lepin/api/src/punch/punch.service.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(coreFile, { jsx: false }).run('no-impure-calls-in-core-files', rule, {
  valid: [
    'export function isRaceOver(edition: Edition, now: Date): boolean { return now > edition.endsAt; }',
    'export function parseIsoDate(raw: string): Date { return new Date(raw); }',
    'export function pickWinner(runners: Runner[], seed: number): Runner { return runners[seed]; }',
    'export function render(document: DocumentModel): string { return document.title; }',
    'export function readStage(config: Config): string { return config.process; }',
  ],
  invalid: [
    {
      code: 'export function isRaceOver(edition: Edition): boolean { return Date.now() > 1; }',
      errors: [{ messageId: 'clock' }],
    },
    {
      code: 'export function stamp(): Date { return new Date(); }',
      errors: [{ messageId: 'clock' }],
    },
    {
      code: 'export function pickWinner(runners: Runner[]): Runner { return runners[Math.random()]; }',
      errors: [{ messageId: 'impureGlobal' }],
    },
    {
      code: 'export function readStage(): string { return process.env.STAGE; }',
      errors: [{ messageId: 'impureGlobal' }],
    },
    {
      code: 'export function log(message: string): void { console.warn(message); }',
      errors: [{ messageId: 'impureGlobal' }],
    },
    {
      code: 'export function readSaved(): string { return localStorage.getItem("k"); }',
      errors: [{ messageId: 'impureGlobal' }],
    },
  ],
});

createRuleTester(serviceFile, { jsx: false }).run(
  'no-impure-calls-in-core-files (impure file)',
  rule,
  {
    valid: [
      'export function stamp(): Date { return new Date(); }',
      'export function readStage(): string { return process.env.STAGE; }',
    ],
    invalid: [],
  },
);
