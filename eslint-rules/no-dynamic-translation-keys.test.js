import { createRuleTester } from './rule-tester.js';
import rule from './no-dynamic-translation-keys.js';

createRuleTester().run('no-dynamic-translation-keys', rule, {
  valid: [
    "const title = t('catalog.page-title');",
    "const count = t('leaderboard.lap-count', { count: lapCount });",
    // The replacement the standard asks for, which is a lookup to a literal.
    'const label = t(STATUS_KEYS[status]);',
    'const label = t(statusKey);',
    // A static template literal, which is only a quoting choice.
    'const title = t(`catalog.page-title`);',
    // A different callee that happens to take a template literal.
    'const path = buildPath(`/songs/${songId}`);',
    'const message = format(`${first} ${second}`);',
    // A call with no arguments at all.
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

// A test often assembles a key to drive a table of cases.
createRuleTester('apps/pragma/site/src/i18n/i18n-parity.core.test.ts', { jsx: false }).run(
  'no-dynamic-translation-keys (test file)',
  rule,
  {
    valid: ['const title = t(`catalog.${status}.title`);'],
    invalid: [],
  },
);
