// @FollowsBlueprint utils-pure-module
import type { Check } from '../check.core.ts';

const REPLY_RULE =
  '[notification-reply] Unless you push, merge or fix something, or CI turned red, end this turn with a single "." and nothing else: a preview comment or CI running is not news, and Claude Code refuses an empty turn or a lone space (measured 2026-11-26). Once CI is green on the head you last pushed and the pull request waits only on the operator, unsubscribe from it (unsubscribe_pr_activity) instead of replying, because every later wake would force a reply he does not want.';

export const notificationGetsNoReply: Check = {
  name: 'notification-gets-no-reply',
  tools: /^ReadNotifications$/u,
  run: () => ({ kind: 'context', text: REPLY_RULE }),
};
