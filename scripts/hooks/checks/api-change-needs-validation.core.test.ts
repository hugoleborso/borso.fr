import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import { apiChangeNeedsValidation } from './api-change-needs-validation.core.ts';

const API_FILES = [
  'apps/pragma/api/src/a.ts',
  'apps/pragma/api/src/b.ts',
  'apps/pragma/api/src/c.ts',
  'apps/pragma/api/src/d.ts',
];
const TECHNICAL_REPORT = 'docs/features/pragma/sign-up/validation/technical-validation-1.md';
const VISUAL_REPORT = 'docs/features/pragma/sign-up/validation/visual-validation-1.md';

function buildWorld(
  changed: readonly string[],
  isHeadOnOrigin = true,
): HookWorld & { readonly calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    projectDirectory: '/repository',
    readEnvironment: () => undefined,
    readText: () => null,
    run: (command, args) => {
      calls.push([command, ...args]);
      if (args[0] === 'rev-parse')
        return { status: isHeadOnOrigin ? 0 : 1, stdout: '', stderr: '' };
      return { status: 0, stdout: `${changed.join('\n')}\n`, stderr: '' };
    },
  };
}

function buildPullRequestInput(head: unknown): HookInput {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__github__create_pull_request',
    tool_input: { head, title: 't', body: 'b' },
  };
}

function buildBashInput(command: unknown): HookInput {
  return { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } };
}

// @FollowsBlueprint test-pure-unit
describe('apiChangeNeedsValidation', () => {
  it('answers both settings matchers, Bash and the MCP create call', () => {
    expect(apiChangeNeedsValidation.tools?.test('Bash')).toBe(true);
    expect(apiChangeNeedsValidation.tools?.test('mcp__github__create_pull_request')).toBe(true);
    expect(apiChangeNeedsValidation.tools?.test('mcp__github__update_pull_request')).toBe(false);
  });

  it('refuses an API change with no technical-validation report, as PR #274 opened', () => {
    const world = buildWorld(API_FILES);

    expect(apiChangeNeedsValidation.run(buildPullRequestInput('topic'), world)).toEqual({
      kind: 'refuse',
      rule: 'api-validation',
      summary: 'opened a pull request changing an API without a technical-validation report',
      lines: [
        '[api-validation] this branch changes 4 file(s) under apps/*/api/ and commits no technical-validation report.',
        '[api-validation] Run /technical-validation, commit its report under docs/features/<app>/<slug>/validation/, then open the pull request.',
        '[api-validation] Run it on finished work. A branch gets two rounds, and a round run on unfinished code to get past this gate is spent: PR #298 merged on a FAIL verdict that way.',
        '[api-validation] If the work needs its preview before it is finished, ask the operator.',
        '[api-validation] First files: apps/pragma/api/src/a.ts apps/pragma/api/src/b.ts apps/pragma/api/src/c.ts ',
      ],
    });
  });

  it('reads a named head from origin, because the shared checkout HEAD can be anyone', () => {
    const world = buildWorld([]);

    apiChangeNeedsValidation.run(buildPullRequestInput('topic'), world);

    expect(world.calls).toEqual([
      ['git', 'fetch', '-q', 'origin', 'main', 'topic'],
      ['git', 'rev-parse', '-q', '--verify', 'origin/topic'],
      ['git', 'diff', '--name-only', 'origin/main...origin/topic'],
    ]);
  });

  it('falls back to HEAD when the named head is not on origin', () => {
    const world = buildWorld([], false);

    apiChangeNeedsValidation.run(buildPullRequestInput('topic'), world);

    expect(world.calls.at(-1)).toEqual(['git', 'diff', '--name-only', 'origin/main...HEAD']);
  });

  it('refuses a front-end change with no visual-validation report', () => {
    const world = buildWorld([...API_FILES, TECHNICAL_REPORT, 'apps/pragma/site/src/Page.tsx']);

    expect(apiChangeNeedsValidation.run(buildPullRequestInput('topic'), world)).toEqual({
      kind: 'refuse',
      rule: 'visual-validation',
      summary: 'opened a pull request changing a front end without a visual-validation report',
      lines: [
        '[visual-validation] this branch changes 1 front-end file(s) under apps/*/site/ and commits no visual-validation report.',
        '[visual-validation] Run /visual-validation once the work is finished, commit its report under docs/features/<app>/<slug>/validation/, then open the pull request.',
        '[visual-validation] First files: apps/pragma/site/src/Page.tsx ',
      ],
    });
  });

  it.each([
    ['both reports', [...API_FILES, TECHNICAL_REPORT, 'apps/pragma/site/src/P.tsx', VISUAL_REPORT]],
    [
      'site tests and markdown only',
      ['apps/pragma/site/src/P.test.tsx', 'apps/pragma/site/README.md'],
    ],
    ['nothing changed', []],
  ])('passes a branch with %s', (_shape, changed) => {
    expect(apiChangeNeedsValidation.run(buildPullRequestInput('topic'), buildWorld(changed))).toBe(
      PASS,
    );
  });

  it('reads the --head of a Bash gh pr create', () => {
    const world = buildWorld(API_FILES);
    const command = 'git push && gh pr create --head topic --body-file b.md';

    expect(apiChangeNeedsValidation.run(buildBashInput(command), world).kind).toBe('refuse');
    expect(world.calls[0]).toEqual(['git', 'fetch', '-q', 'origin', 'main', 'topic']);
  });

  it('compares HEAD without fetching when gh pr create names no head', () => {
    const world = buildWorld([]);

    expect(apiChangeNeedsValidation.run(buildBashInput('gh pr create --fill\n'), world)).toBe(PASS);
    expect(world.calls).toEqual([['git', 'diff', '--name-only', 'origin/main...HEAD']]);
  });

  it.each([
    ['no command and no head', undefined],
    ['another command', 'gh pr view 3'],
    ['a heredoc body naming it', "cat > notes.md <<'EOF'\ngh pr create --head topic\nEOF"],
  ])('passes %s without reading git', (_shape, command) => {
    const world = buildWorld(API_FILES);

    expect(apiChangeNeedsValidation.run(buildBashInput(command), world)).toBe(PASS);
    expect(world.calls).toEqual([]);
  });

  it('passes a call with no input without reading git', () => {
    const world = buildWorld(API_FILES);
    const input: HookInput = { hook_event_name: 'PreToolUse', tool_name: 'Bash' };

    expect(apiChangeNeedsValidation.run(input, world)).toBe(PASS);
    expect(world.calls).toEqual([]);
  });
});
