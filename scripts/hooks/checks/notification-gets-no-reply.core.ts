// @FollowsBlueprint utils-pure-module
import type { Check } from '../check.core.ts';

const REPLY_RULE =
  '[notification-reply] End this turn with no text unless you push, merge or fix something, or CI turned red. CI running or green on a pull request that waits on the operator is not news to him: a reply buries his open question.';

export const notificationGetsNoReply: Check = {
  name: 'notification-gets-no-reply',
  tools: /^ReadNotifications$/u,
  run: () => ({ kind: 'context', text: REPLY_RULE }),
};
