import { createRuleTester } from './rule-tester.js';
import rule from './no-database-client-outside-repository.js';

const serviceFile = 'apps/last-loop-lepin/api/src/punch/punch.service.ts';
const repositoryFile = 'apps/last-loop-lepin/api/src/punch/punch.repository.ts';
const clientFile = 'apps/last-loop-lepin/api/src/database/client.ts';

createRuleTester(serviceFile, { jsx: false }).run('no-database-client-outside-repository', rule, {
  valid: [
    // The handle a repository method takes, which every layer passes along.
    "import type { Database } from '../database/client';",
    "import { type Database } from '../database/client';",
    // Tables rather than a connection.
    "import { punchesTable } from '../database/schema';",
    "import { punchRepository } from './punch.repository';",
    "import { drizzle } from 'drizzle-orm/node-postgres';",
    // A module whose name merely starts the same way.
    "import { clientVersion } from '../database/client-version';",
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
  ],
});

// The repository owns the client, and `database/client.ts` is the client.
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

// The harness that builds the test database, which is not named `.test.ts`.
createRuleTester('apps/last-loop-lepin/test/database-utils.ts', { jsx: false }).run(
  'no-database-client-outside-repository (test harness)',
  rule,
  {
    valid: ["import { getDatabase } from '../api/src/database/client';"],
    invalid: [],
  },
);

// A controller is the layer furthest from the client, and it is where the
// import shows up most often in practice.
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
