// @FollowsBlueprint utils-pure-module
import type { Check } from '../check.core.ts';

const REPLY_RULE =
  '[notification-reply] Write nothing about this notification unless you push, merge or fix something, or CI turned red; a preview comment or CI running is not news. Once CI is green and the pull request waits only on the operator, unsubscribe from it (unsubscribe_pr_activity) instead of replying, because every later wake would force a reply he does not want.';

export const notificationGetsNoReply: Check = {
  name: 'notification-gets-no-reply',
  tools: /^ReadNotifications$/u,
  run: () => ({ kind: 'context', text: REPLY_RULE }),
};
