import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import {
  ghPrCreate,
  isRunningPullRequestCreate,
  readHeadBranch,
  stripHeredocs,
} from './gh-pr-create.core.ts';

const SHORT_BODY = 'Adds a page.';
const LONG_BODY = 'word '.repeat(60).trim();

function buildWorld(files: Readonly<Record<string, string>> = {}): HookWorld {
  return {
    projectDirectory: '/repository',
    readEnvironment: () => undefined,
    readText: (path) => files[path] ?? null,
    run: () => ({ status: 0, stdout: '', stderr: '' }),
  };
}

function buildInput(command: unknown, cwd?: string): HookInput {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command },
    ...(cwd === undefined ? {} : { cwd }),
  };
}

function readLines(command: string, world: HookWorld): readonly string[] {
  const verdict = ghPrCreate.run(buildInput(command, '/work'), world);
  return verdict.kind === 'refuse' ? verdict.lines : [];
}

function composeOpenPrLines(reason: string): string[] {
  return [
    `[open-pr] ${reason}`,
    '[open-pr] Draft from .claude/skills/open-pr/template.md and check it with',
    '[open-pr]   node_modules/.bin/tsx scripts/pr/check-pr-body.ts <draft.md>',
  ];
}

// @FollowsBlueprint test-pure-unit
describe('stripHeredocs', () => {
  it('drops a heredoc body but keeps the rest of the line that opened it', () => {
    expect(stripHeredocs("cat <<'EOF' > notes.md\ngh pr create --body x\nEOF\nls\n\n")).toBe(
      'cat  > notes.md\nls',
    );
  });
});

describe('isRunningPullRequestCreate', () => {
  it('reads gh pr create from any command of a chain, but not another gh pr verb', () => {
    expect(isRunningPullRequestCreate('git push && gh pr create --fill')).toBe(true);
    expect(isRunningPullRequestCreate('gh pr view 12')).toBe(false);
  });

  it('reads neither another gh command that creates nor another binary with a pr create verb', () => {
    expect(isRunningPullRequestCreate('gh repo create demo')).toBe(false);
    expect(isRunningPullRequestCreate('hub pr create')).toBe(false);
  });
});

describe('readHeadBranch', () => {
  it('reads the last --head of each line, as the sed it replaces did', () => {
    expect(readHeadBranch('gh pr create --head a --head=b\nnothing\n--head c')).toBe('b\nc');
  });
});

describe('ghPrCreate', () => {
  it('answers Bash calls only, like its settings matcher', () => {
    expect(ghPrCreate.tools?.test('Bash')).toBe(true);
    expect(ghPrCreate.tools?.test('mcp__github__create_pull_request')).toBe(false);
  });

  it.each([
    ['no command', ''],
    ['a command that is not text', 3],
    ['another command', 'gh pr view 3'],
    ['a heredoc body naming it', "cat > notes.md <<'EOF'\ngh pr create\nEOF"],
    ['a body read from stdin, which the hook cannot inspect', 'gh pr create --body-file -'],
  ])('passes %s', (_shape, command) => {
    expect(ghPrCreate.run(buildInput(command), buildWorld())).toBe(PASS);
  });

  it('passes a call with no input', () => {
    expect(ghPrCreate.run({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }, buildWorld())).toBe(
      PASS,
    );
  });

  it('refuses a pull request without a body flag', () => {
    expect(ghPrCreate.run(buildInput('gh pr create --title t'), buildWorld())).toEqual({
      kind: 'refuse',
      rule: 'open-pr',
      summary:
        'refused gh pr create: no --body / --body-file flag — PRs without a body are rejected.',
      lines: composeOpenPrLines('no --body / --body-file flag — PRs without a body are rejected.'),
    });
  });

  it('refuses a --body-file that names a variable, since the hook reads it before the shell expands it', () => {
    expect(readLines('gh pr create --body-file $BODY', buildWorld())).toEqual(
      composeOpenPrLines(
        '--body-file names a shell variable, $BODY, which this hook reads before the shell expands it; pass the literal path',
      ),
    );
  });

  it('refuses a --body-file that is not written yet, and quotes the whole line when no path follows the flag', () => {
    expect(readLines('gh pr create --body-file', buildWorld())).toEqual(
      composeOpenPrLines(
        '--body-file points at a missing path: gh pr create --body-file. This hook reads it before the command runs, so write it in an earlier call',
      ),
    );
  });

  it('reads a relative --body-file from the call directory, and from the project without one', () => {
    const fromCall = buildWorld({ '/work/body.md': `${SHORT_BODY}\n\n` });
    const fromProject = buildWorld({ '/repository/body.md': SHORT_BODY });

    expect(ghPrCreate.run(buildInput('gh pr create --body-file=body.md', '/work'), fromCall)).toBe(
      PASS,
    );
    expect(ghPrCreate.run(buildInput('gh pr create --body-file body.md'), fromProject)).toBe(PASS);
  });

  it('reads the --body-file of a command spread over several lines from its own line', () => {
    const world = buildWorld({ '/repository/body.md': SHORT_BODY });

    expect(ghPrCreate.run(buildInput('git push &&\ngh pr create --body-file body.md'), world)).toBe(
      PASS,
    );
  });

  it('refuses a --body-file whose content is outside the budget', () => {
    const world = buildWorld({ '/work/body.md': LONG_BODY });

    const [first] = readLines('gh pr create --body-file body.md', world);

    expect(first).toMatch(/^\[open-pr\] the body is outside the budget: /u);
  });

  it('refuses a body outside the budget with the checker report', () => {
    const [first] = readLines(`gh pr create --body "${LONG_BODY}"`, buildWorld());

    expect(first).toMatch(
      /^\[open-pr\] the body is outside the budget: \[pr-body\] Description: \d+ countable chars, limit 200\n\[pr-body\] 1 violation\(s\) in the body$/u,
    );
  });

  it('reads a single-quoted --body when no double-quoted one is on the line', () => {
    expect(readLines(`gh pr create --body '${LONG_BODY}'`, buildWorld())).toHaveLength(3);
    expect(ghPrCreate.run(buildInput(`gh pr create --body '${SHORT_BODY}'`), buildWorld())).toBe(
      PASS,
    );
  });

  it('passes a body within the budget', () => {
    expect(ghPrCreate.run(buildInput(`gh pr create --body "${SHORT_BODY}"`), buildWorld())).toBe(
      PASS,
    );
  });
});
