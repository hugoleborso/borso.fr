import { createRuleTester } from './rule-tester.js';
import rule from './no-client-supplied-address-header.js';

const controllerFile = 'apps/pragma/api/src/auth/auth.controller.ts';
const clientAddressCore = 'apps/pragma/api/src/helpers/client-address/client-address.core.ts';
const testFile = 'apps/pragma/api/src/auth/auth.controller.test.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(controllerFile, { jsx: false }).run('no-client-supplied-address-header', rule, {
  valid: [
    'const clientAddress = readClientAddress(context);',
    "context.req.header('content-type');",
    'context.req.header(`x-${name}`);',
    "const forwardedTo = 'forwarded-to';",
    {
      code: "export const VIEWER_ADDRESS_HEADER = 'x-borso-viewer-address';",
      filename: clientAddressCore,
    },
    {
      code: "const headers = { 'x-forwarded-for': '10.0.0.1' };",
      filename: testFile,
    },
  ],
  invalid: [
    {
      code: "context.req.header('x-forwarded-for');",
      errors: [{ messageId: 'forgeableHeader' }],
    },
    {
      code: "const FORWARDED_FOR_HEADER = 'X-Forwarded-For';",
      errors: [{ messageId: 'forgeableHeader' }],
    },
    { code: 'context.req.header(`x-real-ip`);', errors: [{ messageId: 'forgeableHeader' }] },
    {
      code: "context.req.header('CloudFront-Viewer-Address');",
      errors: [{ messageId: 'forgeableHeader' }],
    },
    {
      code: "context.req.header('x-borso-viewer-address');",
      errors: [{ messageId: 'trustedHeader' }],
    },
    {
      code: "context.req.header('x-forwarded-for');",
      filename: clientAddressCore,
      errors: [{ messageId: 'forgeableHeader' }],
    },
  ],
});
