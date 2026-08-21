import { createRuleTester } from './rule-tester.js';
import rule from './no-database-client-outside-repository.js';

const serviceFile = 'apps/last-loop-lepin/api/src/punch/punch.service.ts';
const repositoryFile = 'apps/last-loop-lepin/api/src/punch/punch.repository.ts';
const clientFile = 'apps/last-loop-lepin/api/src/database/client.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(serviceFile, { jsx: false }).run('no-database-client-outside-repository', rule, {
  valid: [
    "import type { Database } from '../database/client';",
    "import { type Database } from '../database/client';",
    "import { punchesTable } from '../database/schema';",
    "import { punchRepository } from './punch.repository';",
    "import { drizzle } from 'drizzle-orm/node-postgres';",
    "import { clientVersion } from '../database/client-version';",
    "export type { Database } from '../database/client';",
    "export { type Database } from '../database/client';",
    "export { recordPunch } from './punch.repository';",
  ],
  invalid: [
    {
      code: "import { getDatabase } from '../database/client';",
      errors: [{ messageId: 'databaseClientOutsideRepository' }],
    },
    {
      code: "import { getDatabase, type Database } from '../database/client';",
      errors: [{ messageId: 'databaseClientOutsideRepository' }],
    },
    {
      code: "import { getDatabase } from '../../api/src/database/client';",
      errors: [{ messageId: 'databaseClientOutsideRepository' }],
    },
    {
      code: "export { getDatabase } from '../database/client';",
      errors: [{ messageId: 'databaseClientOutsideRepository' }],
    },
    {
      code: "export * from '../database/client';",
      errors: [{ messageId: 'databaseClientOutsideRepository' }],
    },
  ],
});

createRuleTester(repositoryFile, { jsx: false }).run(
  'no-database-client-outside-repository (repository file)',
  rule,
  {
    valid: ["import { getDatabase } from '../database/client';"],
    invalid: [],
  },
);

createRuleTester(clientFile, { jsx: false }).run(
  'no-database-client-outside-repository (client file)',
  rule,
  {
    valid: ["import { getDatabase } from './database/client';"],
    invalid: [],
  },
);

createRuleTester('apps/last-loop-lepin/test/database-utils.ts', { jsx: false }).run(
  'no-database-client-outside-repository (test harness)',
  rule,
  {
    valid: ["import { getDatabase } from '../api/src/database/client';"],
    invalid: [],
  },
);

createRuleTester('apps/last-loop-lepin/api/src/punch/punch.controller.ts', { jsx: false }).run(
  'no-database-client-outside-repository (controller file)',
  rule,
  {
    valid: ["import type { Database } from '../database/client';"],
    invalid: [
      {
        code: "import { getDatabase } from '../database/client';",
        errors: [{ messageId: 'databaseClientOutsideRepository' }],
      },
    ],
  },
);
