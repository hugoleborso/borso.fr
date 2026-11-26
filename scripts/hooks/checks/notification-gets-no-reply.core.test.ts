import { describe, expect, it } from 'vitest';
import type { HookWorld } from '../check.core.ts';
import { notificationGetsNoReply } from './notification-gets-no-reply.core.ts';

const UNUSED_WORLD: HookWorld = {
  projectDirectory: '/repo',
  readEnvironment: () => undefined,
  readText: () => null,
  run: () => ({ status: 0, stdout: '', stderr: '' }),
};

// @FollowsBlueprint test-pure-unit
describe('notificationGetsNoReply', () => {
  it('fires on ReadNotifications only', () => {
    expect(notificationGetsNoReply.tools?.test('ReadNotifications')).toBe(true);
    expect(notificationGetsNoReply.tools?.test('ReadNotificationsLater')).toBe(false);
  });

  it('puts the reply rule at the moment a notification is read, whatever it holds', () => {
    expect(
      notificationGetsNoReply.run(
        { hook_event_name: 'PostToolUse', tool_name: 'ReadNotifications' },
        UNUSED_WORLD,
      ),
    ).toEqual({
      kind: 'context',
      text: '[notification-reply] End this turn with no text unless you push, merge or fix something, or CI turned red. CI running or green on a pull request that waits on the operator is not news to him: a reply buries his open question.',
    });
  });
});
