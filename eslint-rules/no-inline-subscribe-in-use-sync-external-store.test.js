import { createRuleTester } from './rule-tester.js';
import rule from './no-inline-subscribe-in-use-sync-external-store.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-inline-subscribe-in-use-sync-external-store', rule, {
  valid: [
    'useSyncExternalStore(subscribeToCoarsePointer, readCoarsePointer, readServerFallback);',
    'useSyncExternalStore(stableSubscribe, getSnapshot);',
    'React.useSyncExternalStore(subscribeToOnlineStatus, readOnlineStatus);',
    'useSyncExternalStore();',
  ],
  invalid: [
    {
      code: 'useSyncExternalStore((onChange) => query.addEventListener("change", onChange), read);',
      errors: [{ messageId: 'inlineSubscribe' }],
    },
    {
      code: 'useSyncExternalStore(function (onChange) { return listen(onChange); }, read);',
      errors: [{ messageId: 'inlineSubscribe' }],
    },
    {
      code: 'React.useSyncExternalStore((onChange) => listen(onChange), read);',
      errors: [{ messageId: 'inlineSubscribe' }],
    },
  ],
});
