import { describe, expect, it } from 'vitest';
import type { HookInput, HookWorld } from '../check.core.ts';
import { noSwallowedPush } from './no-swallowed-push.core.ts';

const WORLD: HookWorld = {
  projectDirectory: '/repository',
  readEnvironment: () => undefined,
  readText: () => null,
  run: () => ({ status: 1, stdout: '', stderr: '' }),
};

function bash(command: unknown): HookInput {
  return { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } };
}

function judge(command: unknown): ReturnType<typeof noSwallowedPush.run> {
  return noSwallowedPush.run(bash(command), WORLD);
}

// @FollowsBlueprint test-pure-unit
describe('noSwallowedPush', () => {
  it('fires only on Bash', () => {
    expect(noSwallowedPush.tools?.test('Bash')).toBe(true);
    expect(noSwallowedPush.tools?.test('Bashful')).toBe(false);
  });

  it('refuses a mutation run piped into head, because head kills it before the score', () => {
    expect(judge('pnpm exec stryker run --mutate a.ts | head -40')).toEqual({
      kind: 'refuse',
      rule: 'no-swallowed-push',
      summary: 'piped a mutation run into head, which kills it before the score',
      lines: [
        '[no-swallowed-push] a mutation run piped into head is killed once head has its lines,',
        '[no-swallowed-push] with no error and no score, so it reads as a run that finished.',
        '[no-swallowed-push] Write the log to a file and read its end instead:',
        '[no-swallowed-push]   pnpm exec stryker run --mutate <files> > stryker.log 2>&1; tail -40 stryker.log',
      ],
    });
    expect(judge('pnpm test:mutation | head').kind).toBe('refuse');
  });

  it.each([
    'git commit -m x --no-verify',
    'HUSKY=0 git push',
    'cd a && git push origin b --no-verify',
  ])('refuses %s, because a skipped git hook never reports its gate', (command) => {
    expect(judge(command)).toEqual({
      kind: 'refuse',
      rule: 'no-swallowed-push',
      summary: 'skipped the git hooks with --no-verify or HUSKY=0',
      lines: [
        '[no-swallowed-push] --no-verify and HUSKY=0 skip the git hooks, so their gates never report.',
        '[no-swallowed-push] Run the commit or push bare and fix what the hook reports.',
      ],
    });
  });

  it('refuses git push errors sent to /dev/null, because pre-push refusals print on stderr', () => {
    expect(judge('git push -u origin b 2>&1 >/dev/null')).toEqual({
      kind: 'refuse',
      rule: 'no-swallowed-push',
      summary: 'sent git push or git commit errors to /dev/null',
      lines: [
        "[no-swallowed-push] git's errors and every pre-commit or pre-push refusal go to stderr, and",
        '[no-swallowed-push] /dev/null throws them away; a command after ; then sets the exit status too.',
        '[no-swallowed-push] Keep the output where you can read it:',
        '[no-swallowed-push]   git push -u origin <branch> > push.log 2>&1; echo "push=$?"; tail -20 push.log',
      ],
    });
  });

  it('runs a git push piped into another command again with pipefail on, and says so', () => {
    expect(judge('git push origin b 2>&1 | tail -5')).toEqual({
      kind: 'rewrite',
      updatedInput: { command: 'set -o pipefail; git push origin b 2>&1 | tail -5' },
      text: '[no-swallowed-push] The command ran with set -o pipefail in front, so a failed git exits non-zero. A later stage can too on its own: grep exits 1 when nothing matches, after a push that succeeded. Before calling a push failed, read git ls-remote origin <branch>.',
    });
  });

  it.each(['set -o pipefail; git push | tail', 'set -euo pipefail\ngit commit -m x | tail'])(
    'lets %j through, because pipefail already keeps the status',
    (command) => {
      expect(judge(command).kind).toBe('pass');
    },
  );

  it.each([
    'git commit -F msg > log 2>&1; grep x log | head',
    'echo "never write git push | tail"',
    'cat <<EOF\ngit push | tail\nEOF',
    'git push origin b > push.log 2>&1',
    'git status | head',
  ])('lets %j through, because no git push or commit status sits in a pipe', (command) => {
    expect(judge(command).kind).toBe('pass');
  });

  it('lets a call with no command through', () => {
    expect(judge(undefined).kind).toBe('pass');
  });
});
