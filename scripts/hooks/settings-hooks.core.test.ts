import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Check, PASS } from './check.core.ts';
import { CHECKS_BY_EVENT } from './hook-events.ts';
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
});

describe('the repository settings', () => {
  const settings: unknown = JSON.parse(
    readFileSync(resolve(import.meta.dirname, '../../.claude/settings.json'), 'utf8'),
  );

  it('run every hook through the one TypeScript entry', () => {
    expect(selectForeignHookCommands(settings)).toEqual([]);
  });

  it('let every tool a check reads reach it', () => {
    expect(listToolsNoMatcherReaches(settings, CHECKS_BY_EVENT)).toEqual([]);
  });
});
