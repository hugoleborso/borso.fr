import { createRuleTester } from './rule-tester.js';
import rule from './verb-promises-match-return-type.js';

// @FollowsBlueprint test-lint-rule
createRuleTester('apps/pragma/api/src/songs/songs.core.ts', { jsx: false }).run(
  'verb-promises-match-return-type',
  rule,
  {
    valid: [
      { code: 'function listProblems(): Problem[] { return []; }' },
      { code: 'function listProblems(): readonly Problem[] { return []; }' },
      { code: 'function listProblems(): ReadonlyArray<Problem> { return []; }' },
      { code: 'function listProblems(): Array<Problem> { return []; }' },
      { code: 'function listPair(): [string, string] { return ["a", "b"]; }' },
      { code: 'async function listProblems(): Promise<Problem[]> { return []; }' },
      { code: 'function findGate(name: string): Gate | null { return null; }' },
      { code: 'function findOpening(id: string): Opening | undefined { return undefined; }' },
      { code: 'function findTarget(s: Selection): Target { return s.target; }' },
      { code: 'function isFinished(runner: Runner): boolean { return true; }' },
      { code: 'function isProblem(value: unknown): value is Problem { return true; }' },
      { code: 'function hasUpload(runner: Runner): boolean { return true; }' },
      { code: 'function canSelfPunch(runner: Runner): boolean { return true; }' },
      // No annotation, so the promise is unfalsifiable and another rule's problem.
      { code: 'function listProblems() { return 3; }' },
      // The verb needs an upper case letter after it, which is what tells
      // `listing` from `listProblems` and `island` from `isReady`.
      { code: 'function listing(): number { return 1; }' },
      { code: 'function island(): number { return 1; }' },
      { code: 'function finder(): number[] { return []; }' },
      // Other verbs from the table promise a shape no annotation can settle.
      { code: 'function buildTitle(): string[] { return []; }' },
      { code: 'function selectVisibleSongs(): Song[] { return []; }' },
      { code: 'const listProblems = (): Problem[] => [];' },
    ],
    invalid: [
      {
        code: 'function findProblems(): Problem[] { return []; }',
        errors: [{ messageId: 'brokenPromise' }],
      },
      {
        code: 'function findProblems(): readonly Problem[] { return []; }',
        errors: [{ messageId: 'brokenPromise' }],
      },
      {
        code: 'function findProblems(): Array<Problem> { return []; }',
        errors: [{ messageId: 'brokenPromise' }],
      },
      {
        code: 'async function findProblems(): Promise<Problem[]> { return []; }',
        errors: [{ messageId: 'brokenPromise' }],
      },
      {
        code: 'function listProblem(): Problem { return problem; }',
        errors: [{ messageId: 'brokenPromise' }],
      },
      {
        code: 'function listProblem(): Problem | null { return null; }',
        errors: [{ messageId: 'brokenPromise' }],
      },
      {
        code: 'function isFinished(): string { return "yes"; }',
        errors: [{ messageId: 'brokenPromise' }],
      },
      {
        code: 'function hasUpload(): number { return 1; }',
        errors: [{ messageId: 'brokenPromise' }],
      },
      {
        code: 'function canSelfPunch(): Permission { return permission; }',
        errors: [{ messageId: 'brokenPromise' }],
      },
      {
        code: 'const findProblems = (): Problem[] => [];',
        errors: [{ messageId: 'brokenPromise' }],
      },
      {
        code: 'const helpers = { findProblems: function (): Problem[] { return []; } };',
        errors: [{ messageId: 'brokenPromise' }],
      },
      {
        code: 'declare function findProblems(): Problem[];',
        errors: [{ messageId: 'brokenPromise' }],
      },
      // A bare `Promise` has no inner type, so the check falls on `Promise`
      // itself. TypeScript rejects the annotation too.
      {
        code: 'async function listProblems(): Promise { return []; }',
        errors: [{ messageId: 'brokenPromise' }],
      },
    ],
  },
);
