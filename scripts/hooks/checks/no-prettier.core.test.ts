import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import { noPrettier } from './no-prettier.core.ts';

function buildWorld(hasOxfmt: boolean): HookWorld {
  return {
    projectDirectory: '/repository',
    readEnvironment: () => undefined,
    readText: (path) => (hasOxfmt && path === 'node_modules/.bin/oxfmt' ? '#!/bin/sh' : null),
    run: () => ({ status: 0, stdout: '', stderr: '' }),
  };
}

function buildInput(command: unknown): HookInput {
  return { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } };
}

const WITH_OXFMT = buildWorld(true);

// @FollowsBlueprint test-pure-unit
describe('noPrettier', () => {
  it('answers Bash calls only, like its settings matcher', () => {
    expect(noPrettier.tools?.test('Bash')).toBe(true);
    expect(noPrettier.tools?.test('BashOutput')).toBe(false);
  });

  it('refuses Prettier behind a package runner, because it rewrites lines oxfmt leaves alone', () => {
    expect(noPrettier.run(buildInput('pnpm exec prettier --write src'), WITH_OXFMT)).toEqual({
      kind: 'refuse',
      rule: 'no-prettier',
      summary: 'ran Prettier in a repository that formats with oxfmt',
      lines: [
        '[no-prettier] This repository formats with oxfmt, and Prettier rewrites lines oxfmt leaves alone.',
        '[no-prettier] Format only the files you changed, with oxfmt:',
        '[no-prettier]   pnpm exec oxfmt <files>          (writes)',
        '[no-prettier]   pnpm exec oxfmt --check <files>  (checks)',
      ],
    });
  });

  it.each([
    ['bare, after a chain', 'cd site && prettier --check .'],
    ['by path', 'node_modules/.bin/prettier -w a.ts'],
    ['behind a runner and its flags', 'npx --yes prettier --check .'],
    ['inside a substitution', 'echo $(yarn prettier -c .)'],
  ])('refuses Prettier run %s', (_shape, command) => {
    expect(noPrettier.run(buildInput(command), WITH_OXFMT).kind).toBe('refuse');
  });

  it.each([
    ['a search for the word', 'grep -rn prettier docs'],
    ['a quoted mention', 'echo "prettier --write" && ls'],
    ['a dependency install', 'pnpm add -D prettier'],
    ['a runner with nothing after its flags', 'npx --yes'],
    ['a heredoc body naming it', "cat > notes.md <<'EOF'\nprettier --write .\nEOF"],
  ])('lets %s through, since it runs nothing', (_shape, command) => {
    expect(noPrettier.run(buildInput(command), WITH_OXFMT)).toBe(PASS);
  });

  it('leaves a repository with no oxfmt binary alone, since the hook ships to Prettier repositories', () => {
    expect(noPrettier.run(buildInput('prettier --write .'), buildWorld(false))).toBe(PASS);
  });

  it('passes a call with no command or a command that is not text', () => {
    expect(noPrettier.run(buildInput(''), WITH_OXFMT)).toBe(PASS);
    expect(noPrettier.run(buildInput(42), WITH_OXFMT)).toBe(PASS);
    expect(noPrettier.run({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }, WITH_OXFMT)).toBe(
      PASS,
    );
  });
});
