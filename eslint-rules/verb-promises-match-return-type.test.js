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
      { code: 'function listProblems() { return 3; }' },
      { code: 'function listing(): number { return 1; }' },
      { code: 'function island(): number { return 1; }' },
      { code: 'function finder(): number[] { return []; }' },
      { code: 'function buildTitle(): string[] { return []; }' },
      { code: 'function selectVisibleSongs(): Song[] { return []; }' },
      { code: 'const listProblems = (): Problem[] => [];' },
      {
        code: 'function getWrittenTake(id: string): Take { const take = lookup(id); if (take === null) throw new Error("absent"); return take; }',
      },
      {
        code: 'function findTake(id: string): Take | null { try { return parse(id); } catch { return null; } }',
      },
      {
        code: 'function findTake(id: string): Take | null { try { if (id === "") throw new Error("empty"); return parse(id); } catch { return null; } }',
      },
      {
        code: 'function findTake(ids: string[]): Take | null { ids.forEach((id) => { if (id === "") throw new Error("empty"); }); return null; }',
      },
      {
        code: 'function findTake(id: string): Take | null { function getOrThrow(): Take { throw new Error("absent"); } return id === "" ? null : getOrThrow(); }',
      },
      { code: 'function finder(): Take { throw new Error("absent"); }' },
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
      {
        code: 'async function listProblems(): Promise { return []; }',
        errors: [{ messageId: 'brokenPromise' }],
      },
      {
        code: 'async function findWrittenTakeWithin(executor: Executor, id: string): Promise<Take> { const take = await findTakeOn(executor, id); if (take === null) throw new Error("not visible"); return take; }',
        errors: [{ messageId: 'throwingFind' }],
      },
      {
        code: 'const findTake = (id: string) => { if (id === "") throw new Error("empty"); return lookup(id); };',
        errors: [{ messageId: 'throwingFind' }],
      },
      {
        code: 'function findTake(id: string): Take | null { try { return parse(id); } finally { if (id === "") throw new Error("empty"); } }',
        errors: [{ messageId: 'throwingFind' }],
      },
      {
        code: 'function findTake(id: string): Take | null { try { return parse(id); } catch { throw new Error("unreadable"); } }',
        errors: [{ messageId: 'throwingFind' }],
      },
      {
        code: 'const store = { findTake(id: string): Take { throw new Error(id); } };',
        errors: [{ messageId: 'throwingFind' }],
      },
    ],
  },
);
