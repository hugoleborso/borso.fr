import { createRuleTester } from './rule-tester.js';
import rule from './no-vendor-sdk-outside-adapter.js';

const moleculeFile = 'apps/last-loop-lepin/site/src/components/molecules/RunnerAvatar.tsx';
const adapterFile = 'apps/last-loop-lepin/site/src/observability/sentry.ts';
const backEndFile = 'apps/last-loop-lepin/api/src/punch/punch.service.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(moleculeFile).run('no-vendor-sdk-outside-adapter (component)', rule, {
  valid: [
    "import { recordDiagnosticEvent } from '../../observability/sentry';",
    "import { useState } from 'react';",
    "import { sentryish } from '@sentry-community/helpers-legacy';",
  ],
  invalid: [
    {
      code: "import * as Sentry from '@sentry/react';",
      errors: [{ messageId: 'vendorSdkOutsideAdapter' }],
    },
    {
      code: "import { addBreadcrumb } from '@sentry/browser';",
      errors: [{ messageId: 'vendorSdkOutsideAdapter' }],
    },
    {
      code: "import posthog from 'posthog-js';",
      errors: [{ messageId: 'vendorSdkOutsideAdapter' }],
    },
    {
      code: "export { addBreadcrumb } from '@sentry/react';",
      errors: [{ messageId: 'vendorSdkOutsideAdapter' }],
    },
  ],
});

createRuleTester(adapterFile, { jsx: false }).run('no-vendor-sdk-outside-adapter (adapter)', rule, {
  valid: ["import * as Sentry from '@sentry/react';"],
  invalid: [],
});

createRuleTester(backEndFile, { jsx: false }).run(
  'no-vendor-sdk-outside-adapter (back end)',
  rule,
  {
    valid: ["import * as Sentry from '@sentry/node';"],
    invalid: [],
  },
);

createRuleTester('apps/last-loop-lepin/site/src/components/molecules/RunnerAvatar.test.tsx').run(
  'no-vendor-sdk-outside-adapter (test)',
  rule,
  {
    valid: ["import * as Sentry from '@sentry/react';"],
    invalid: [],
  },
);
