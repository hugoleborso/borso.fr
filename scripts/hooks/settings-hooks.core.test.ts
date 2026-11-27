import { describe, expect, it } from 'vitest';
import { type Check, PASS } from './check.core.ts';
import {
  HOOK_COMMAND,
  listSettingsHookCommands,
  listToolsNoMatcherReaches,
  selectForeignHookCommands,
} from './settings-hooks.core.ts';

const NO_CHECKS = {
  PreToolUse: [],
  PostToolUse: [],
  PostToolUseFailure: [],
  Stop: [],
  SessionStart: [],
};

function checkOn(tools: RegExp | null): Check {
  return { name: 'check', tools, run: () => PASS };
}

// @FollowsBlueprint test-pure-unit
describe('listSettingsHookCommands', () => {
  it('lists every command with its event and matcher', () => {
    const settings = {
      hooks: {
        PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: HOOK_COMMAND }] }],
        Stop: [{ hooks: [{ type: 'command', command: 'x.sh' }] }],
      },
    };

    expect(listSettingsHookCommands(settings)).toEqual([
      { event: 'PreToolUse', matcher: 'Bash', command: HOOK_COMMAND },
      { event: 'Stop', matcher: '', command: 'x.sh' },
    ]);
  });

  it('reads nothing from settings without hooks or with malformed groups', () => {
    expect(listSettingsHookCommands(null)).toEqual([]);
    expect(listSettingsHookCommands({ hooks: [] })).toEqual([]);
    expect(
      listSettingsHookCommands({
        hooks: { Stop: [null, { hooks: 'x' }, { hooks: [{ type: 'prompt' }] }] },
      }),
    ).toEqual([]);
    expect(listSettingsHookCommands({ hooks: { Stop: 'x' } })).toEqual([]);
    expect(listSettingsHookCommands('hooks')).toEqual([]);
  });
});

describe('selectForeignHookCommands, so every hook is TypeScript the gates read', () => {
  it('refuses any command other than the one node entry', () => {
    const settings = {
      hooks: {
        PreToolUse: [{ hooks: [{ command: HOOK_COMMAND }, { command: '.claude/hooks/x.sh' }] }],
      },
    };

    expect(selectForeignHookCommands(settings)).toEqual([
      { event: 'PreToolUse', matcher: '', command: '.claude/hooks/x.sh' },
    ]);
  });
});

describe('listToolsNoMatcherReaches, so a check never sits behind a matcher that skips it', () => {
  it('names a tool a check reads when no matcher of its event lets it through', () => {
    const settings = {
      hooks: { PreToolUse: [{ matcher: 'Bash|Skill', hooks: [{ command: HOOK_COMMAND }] }] },
    };
    const checksByEvent = { ...NO_CHECKS, PreToolUse: [checkOn(/^(Bash|Artifact)$/u)] };

    expect(listToolsNoMatcherReaches(settings, checksByEvent)).toEqual(['PreToolUse Artifact']);
  });

  it('reads a single tool, a non-capturing group and a pattern, and skips a check on every tool', () => {
    const settings = {
      hooks: {
        PostToolUse: [{ matcher: 'Bash|mcp__.*', hooks: [{ command: HOOK_COMMAND }] }],
        Stop: [{ hooks: [{ command: HOOK_COMMAND }] }],
        SessionStart: [{ matcher: '*', hooks: [{ command: HOOK_COMMAND }] }],
      },
    };
    const checksByEvent = {
      ...NO_CHECKS,
      PostToolUse: [checkOn(/^Bash$/u), checkOn(/^(?:mcp__.*)$/u)],
      Stop: [checkOn(null)],
      SessionStart: [checkOn(/^Read$/u)],
    };

    expect(listToolsNoMatcherReaches(settings, checksByEvent)).toEqual([]);
  });

  it('skips a check on every tool even behind a narrow matcher, and reads a group with no matcher as every tool', () => {
    const settings = {
      hooks: {
        PreToolUse: [{ matcher: 'Bash', hooks: [{ command: HOOK_COMMAND }] }],
        PostToolUseFailure: [{ hooks: [{ command: HOOK_COMMAND }] }],
      },
    };
    const checksByEvent = {
      ...NO_CHECKS,
      PreToolUse: [checkOn(null)],
      PostToolUseFailure: [checkOn(/^Bash$/u)],
    };

    expect(listToolsNoMatcherReaches(settings, checksByEvent)).toEqual([]);
  });

  it('reads a source that is not anchored as written', () => {
    const settings = {
      hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ command: HOOK_COMMAND }] }] },
    };
    const checksByEvent = { ...NO_CHECKS, PreToolUse: [checkOn(/a\^b/u), checkOn(/^(a\$b)$/u)] };

    expect(listToolsNoMatcherReaches(settings, checksByEvent)).toEqual([
      'PreToolUse a\\^b',
      'PreToolUse a\\$b',
    ]);
  });

  it('counts only the matchers of the check event, read as unicode patterns', () => {
    const settings = {
      hooks: {
        PreToolUse: [{ matcher: '\\p{Lu}kill', hooks: [{ command: HOOK_COMMAND }] }],
        PostToolUse: [{ matcher: 'Bash', hooks: [{ command: HOOK_COMMAND }] }],
      },
    };
    const checksByEvent = { ...NO_CHECKS, PreToolUse: [checkOn(/^(Bash|Skill)$/u)] };

    expect(listToolsNoMatcherReaches(settings, checksByEvent)).toEqual(['PreToolUse Bash']);
  });
});
