import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import { noTestDoubleDash } from './no-test-double-dash.core.ts';

const WORLD: HookWorld = {
  projectDirectory: '/repository',
  readEnvironment: () => undefined,
  readText: () => null,
  run: () => ({ status: 0, stdout: '', stderr: '' }),
};

function buildInput(command: unknown): HookInput {
  return { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } };
}

// @FollowsBlueprint test-pure-unit
describe('noTestDoubleDash', () => {
  it('answers Bash calls only, like its settings matcher', () => {
    expect(noTestDoubleDash.tools?.test('Bash')).toBe(true);
    expect(noTestDoubleDash.tools?.test('Skill')).toBe(false);
  });

  it('refuses -- after a pnpm test script, because Vitest then drops the file filter', () => {
    expect(
      noTestDoubleDash.run(buildInput('pnpm --filter pragma run test:e2e -- a.spec.ts'), WORLD),
    ).toEqual({
      kind: 'refuse',
      rule: 'no-test-double-dash',
      summary: 'passed -- to a pnpm test script, which makes Vitest run every file',
      lines: [
        '[no-test-double-dash] pnpm passes the -- on to Vitest, which then drops your file filter and runs every file.',
        '[no-test-double-dash] Drop the --:',
        '[no-test-double-dash]   pnpm --filter <pkg> run test:e2e <files>',
        '[no-test-double-dash] Or call Vitest with its project:',
        '[no-test-double-dash]   pnpm exec vitest run --project <name> <files>',
      ],
    });
  });

  it.each([
    ['at the end of the command', 'pnpm run test --'],
    ['after a chain', 'cd apps/pragma && pnpm run test:unit -- a.test.ts'],
    ['quoted, which pnpm still passes on', 'pnpm run test "--" a.test.ts'],
  ])('refuses the -- %s', (_shape, command) => {
    expect(noTestDoubleDash.run(buildInput(command), WORLD).kind).toBe('refuse');
  });

  it.each([
    ['files given without --', 'pnpm --filter pragma run test:e2e a.spec.ts'],
    ['a flag that starts with --', 'pnpm run test --coverage'],
    ['a script that is not a test', 'pnpm run build -- --watch'],
    ['run as the last word', 'pnpm run'],
    ['a binary named test run through exec', 'pnpm exec test -- a.test.ts'],
    ['another runner', 'npm run test -- a.test.ts'],
    ['a quoted mention', 'echo "pnpm run test -- x"'],
  ])('lets %s through', (_shape, command) => {
    expect(noTestDoubleDash.run(buildInput(command), WORLD)).toBe(PASS);
  });

  it('passes a call with no command or a command that is not text', () => {
    expect(noTestDoubleDash.run(buildInput(''), WORLD)).toBe(PASS);
    expect(noTestDoubleDash.run(buildInput(undefined), WORLD)).toBe(PASS);
    expect(noTestDoubleDash.run({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }, WORLD)).toBe(
      PASS,
    );
  });
});
