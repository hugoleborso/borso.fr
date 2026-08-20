import { createRuleTester } from './rule-tester.js';
import rule from './no-dynamic-translation-keys.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-dynamic-translation-keys', rule, {
  valid: [
    "const title = t('catalog.page-title');",
    "const count = t('leaderboard.lap-count', { count: lapCount });",
    'const label = t(STATUS_KEYS[status]);',
    'const label = t(statusKey);',
    'const title = t(`catalog.page-title`);',
    'const path = buildPath(`/songs/${songId}`);',
    'const message = format(`${first} ${second}`);',
    'const translate = t();',
  ],
  invalid: [
    {
      code: 'const title = t(`catalog.${status}.title`);',
      errors: [{ messageId: 'dynamicTranslationKey' }],
    },
    {
      code: "const title = t('catalog.' + status);",
      errors: [{ messageId: 'dynamicTranslationKey' }],
    },
    {
      code: 'const title = i18n.t(`catalog.${status}.title`);',
      errors: [{ messageId: 'dynamicTranslationKey' }],
    },
  ],
});

createRuleTester('apps/pragma/site/src/i18n/i18n-parity.core.test.ts', { jsx: false }).run(
  'no-dynamic-translation-keys (test file)',
  rule,
  {
    valid: ['const title = t(`catalog.${status}.title`);'],
    invalid: [],
  },
);
