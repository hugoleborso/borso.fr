import { describe, expect, it } from 'vitest';
import { type Check, PASS, refuse, renderOutcome, selectChecksFor } from './check.core.ts';

const EVERY_TOOL: Check = { name: 'every', tools: null, run: () => PASS };
const BASH_ONLY: Check = { name: 'bash', tools: /^Bash$/u, run: () => PASS };

// @FollowsBlueprint test-pure-unit
describe('selectChecksFor', () => {
  it('keeps a check with no matcher and one whose matcher names the tool', () => {
    expect(selectChecksFor([EVERY_TOOL, BASH_ONLY], 'Bash')).toEqual([EVERY_TOOL, BASH_ONLY]);
  });

  it('drops a check whose matcher names another tool, and reads a missing tool as none', () => {
    expect(selectChecksFor([EVERY_TOOL, BASH_ONLY], undefined)).toEqual([EVERY_TOOL]);
  });

  it('matches a missing tool as an empty name', () => {
    const NO_TOOL: Check = { name: 'none', tools: /^$/u, run: () => PASS };

    expect(selectChecksFor([NO_TOOL], undefined)).toEqual([NO_TOOL]);
  });
});

describe('renderOutcome', () => {
  it('refuses with every refusal line, tagged by rule, and says nothing ran before a tool', () => {
    const outcome = renderOutcome('PreToolUse', [
      refuse('no-prettier', 'ran Prettier', ['Use oxfmt.']),
      { kind: 'context', text: 'ignored once something refuses' },
    ]);

    expect(outcome).toEqual({
      exitCode: 2,
      stdout: '',
      stderr:
        '[no-prettier] Use oxfmt.\n' +
        '[hook] Nothing in this call ran. In a chained command, rerun the other steps on their own.\n',
      refusals: [{ rule: 'no-prettier', summary: 'ran Prettier' }],
    });
  });

  it('refuses after a tool ran without claiming that nothing ran', () => {
    expect(renderOutcome('PostToolUse', [refuse('lint', 'broke a rule', ['Fix it.'])]).stderr).toBe(
      '[lint] Fix it.\n',
    );
  });

  it('blocks a stop with every reason', () => {
    expect(
      renderOutcome('Stop', [
        { kind: 'block', reason: 'first' },
        { kind: 'block', reason: 'second' },
      ]),
    ).toEqual({
      exitCode: 0,
      stdout: '{"decision":"block","reason":"first\\n\\nsecond"}',
      stderr: '',
      refusals: [],
    });
  });

  it('joins every context for the event that fired', () => {
    expect(
      renderOutcome('PostToolUse', [
        { kind: 'context', text: 'a' },
        PASS,
        { kind: 'context', text: 'b' },
      ]),
    ).toEqual({
      exitCode: 0,
      stdout:
        '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"a\\n\\nb"}}',
      stderr: '',
      refusals: [],
    });
  });

  it('hands back the rewritten input of a repairing check beside every note', () => {
    expect(
      renderOutcome('PreToolUse', [
        { kind: 'context', text: 'a' },
        {
          kind: 'rewrite',
          updatedInput: { command: 'set -o pipefail; git push | tail' },
          text: 'b',
        },
      ]).stdout,
    ).toBe(
      '{"hookSpecificOutput":{"hookEventName":"PreToolUse",' +
        '"updatedInput":{"command":"set -o pipefail; git push | tail"},"additionalContext":"a\\n\\nb"}}',
    );
  });

  it('prints nothing when every check passes', () => {
    expect(renderOutcome('PreToolUse', [PASS])).toEqual({
      exitCode: 0,
      stdout: '',
      stderr: '',
      refusals: [],
    });
  });
});
