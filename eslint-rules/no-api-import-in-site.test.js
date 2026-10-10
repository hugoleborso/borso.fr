import { describe, expect, it } from 'vitest';
import { createRuleTester } from './rule-tester.js';
import rule, { readApiTarget } from './no-api-import-in-site.js';

const siteFile = 'apps/banana-rush/site/src/lib/invitation.core.ts';
const clientFile = 'apps/banana-rush/site/src/lib/api.client.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(siteFile, { jsx: false }).run('no-api-import-in-site', rule, {
  valid: [
    "import { normalizeJoinCode } from '@domain/join-code.core';",
    "import { readInvitedCode } from '@site/lib/invitation.core';",
    "import { buildInvitationUrl } from './invitation.core';",
    "import { hc } from 'hono/client';",
    "import type { AppRouter } from '@api/app';",
    "import { type AppRouter } from '@api/app';",
    { code: "import type { AppType } from '../../../api/src/app';", filename: clientFile },
    "export type { AppRouter } from '@api/app';",
    "import { describeApiError } from './api-failure.core';",
  ],
  invalid: [
    {
      code: "import { normalizeJoinCode } from '@api/games/join-code.utils';",
      errors: [{ messageId: 'apiImport' }],
    },
    {
      code: "import { JOIN_CODE_LENGTH } from '@api/games/games.schema';",
      errors: [{ messageId: 'apiImport' }],
    },
    {
      code: "import type { GameView } from '@api/games/games.types';",
      errors: [{ messageId: 'apiImport' }],
    },
    {
      code: "import { app } from '@api/app';",
      errors: [{ messageId: 'apiImport' }],
    },
    {
      code: "import { evaluateTransition } from '../../../api/src/setlists/transition.core';",
      errors: [{ messageId: 'apiImport' }],
    },
    {
      code: "export { MINIMUM_SEATS } from '@api/games/game.core';",
      errors: [{ messageId: 'apiImport' }],
    },
    {
      code: "export * from '@api/games/games.schema';",
      errors: [{ messageId: 'apiImport' }],
    },
    {
      code: "const module = await import('@api/games/join-code.utils');",
      errors: [{ messageId: 'apiImport' }],
    },
  ],
});

createRuleTester('apps/banana-rush/api/src/games/games.service.ts', { jsx: false }).run(
  'no-api-import-in-site (api file)',
  rule,
  {
    valid: ["import { JOIN_CODE_LENGTH } from '@api/games/games.schema';"],
    invalid: [],
  },
);

createRuleTester(siteFile, { jsx: false }).run('no-api-import-in-site', rule, {
  valid: [
    [
      '// eslint-disable-next-line rule-to-test/no-api-import-in-site -- a reason a reviewer can check',
      "import { normalizeJoinCode } from '@api/games/join-code.utils';",
    ].join('\n'),
  ],
  invalid: [],
});

describe('readApiTarget', () => {
  it('ignores a relative path that stays inside the site', () => {
    expect(readApiTarget(siteFile, '../api-failure.core')).toBeNull();
  });

  it('recognises the router module reached through a relative path', () => {
    expect(readApiTarget(clientFile, '../../../api/src/app')).toEqual({ isRouterModule: true });
  });

  it('tells another application module from the router module', () => {
    expect(readApiTarget(clientFile, '../../../api/src/application')).toEqual({
      isRouterModule: false,
    });
  });
});
