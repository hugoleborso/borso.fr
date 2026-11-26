import { describe, expect, it } from 'vitest';
import {
  expectedEntryCommand,
  listSettingsHookCommands,
  selectForeignHookCommands,
} from './settings-hooks.core.ts';

const ENTRY = 'node "$CLAUDE_PROJECT_DIR"/scripts/hooks/pre-tool-use.ts';

// @FollowsBlueprint test-pure-unit
describe('listSettingsHookCommands', () => {
  it('lists every command under every event and matcher group', () => {
    const settings = {
      hooks: {
        PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: ENTRY }] }],
        Stop: [{ hooks: [{ type: 'command', command: 'x.sh' }] }],
      },
    };

    expect(listSettingsHookCommands(settings)).toEqual([
      { event: 'PreToolUse', command: ENTRY },
      { event: 'Stop', command: 'x.sh' },
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

describe('expectedEntryCommand', () => {
  it('names the node entry of a known event', () => {
    expect(expectedEntryCommand('PreToolUse')).toBe(ENTRY);
  });

  it('names nothing for an event with no TypeScript entry', () => {
    expect(expectedEntryCommand('Notification')).toBeNull();
    expect(expectedEntryCommand('toString')).toBeNull();
  });
});

describe('selectForeignHookCommands, so every hook is TypeScript the gates read', () => {
  it('refuses a bash hook, a hook under the wrong event and an unknown event', () => {
    const settings = {
      hooks: {
        PreToolUse: [{ hooks: [{ command: ENTRY }, { command: '.claude/hooks/x.sh' }] }],
        Stop: [{ hooks: [{ command: ENTRY }] }],
        Notification: [{ hooks: [{ command: ENTRY }] }],
      },
    };

    expect(selectForeignHookCommands(settings)).toEqual([
      { event: 'PreToolUse', command: '.claude/hooks/x.sh' },
      { event: 'Stop', command: ENTRY },
      { event: 'Notification', command: ENTRY },
    ]);
  });
});
