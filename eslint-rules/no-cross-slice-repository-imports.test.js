import { createRuleTester } from './rule-tester.js';
import rule from './no-cross-slice-repository-imports.js';

const serviceFile = 'apps/last-loop-lepin/api/src/ranking/ranking.service.ts';
const repositoryFile = 'apps/last-loop-lepin/api/src/ranking/ranking.repository.ts';
const testFile = 'apps/last-loop-lepin/api/src/ranking/ranking.service.test.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(serviceFile, { jsx: false }).run('no-cross-slice-repository-imports', rule, {
  valid: [
    // The slice's own repository.
    "import { listRankings } from './ranking.repository';",
    "import { listRankings } from './ranking.repository.js';",
    // The supported ways across a boundary.
    "import { punchService } from '../punch/punch.service';",
    "import type { Punch } from '../punch/punch.types';",
    "import { punchesTable } from '../punch/punch.schema';",
    "import { getDatabase } from '../database/client';",
    "import { eq } from 'drizzle-orm';",
    // A module whose name merely ends in something similar.
    "import { buildReport } from '../punch/punch.repository-report';",
  ],
  invalid: [
    {
      code: "import { insertPunch } from '../punch/punch.repository';",
      errors: [{ messageId: 'crossSliceRepository' }],
    },
    {
      code: "import type { PunchRow } from '../../punch/punch.repository';",
      errors: [{ messageId: 'crossSliceRepository' }],
    },
    {
      code: "import { listForRunner } from '../punch/punch.repository.js';",
      errors: [{ messageId: 'crossSliceRepository' }],
    },
  ],
});

// A repository is bound by the same rule, since one repository reaching into
// another is the same loss of ownership.
createRuleTester(repositoryFile, { jsx: false }).run(
  'no-cross-slice-repository-imports (repository file)',
  rule,
  {
    valid: ["import { punchesTable } from '../punch/punch.schema';"],
    invalid: [
      {
        code: "import { insertPunch } from '../punch/punch.repository';",
        errors: [{ messageId: 'crossSliceRepository' }],
      },
    ],
  },
);

// The back end end to end suite drives repositories directly, across slices,
// from a sibling test and from the harness folder alike.
createRuleTester(testFile, { jsx: false }).run(
  'no-cross-slice-repository-imports (test file)',
  rule,
  {
    valid: ["import { insertPunch } from '../punch/punch.repository';"],
    invalid: [],
  },
);

createRuleTester('apps/last-loop-lepin/test/database-utils.ts', { jsx: false }).run(
  'no-cross-slice-repository-imports (test harness)',
  rule,
  {
    valid: ["import { insertPunch } from '../api/src/punch/punch.repository';"],
    invalid: [],
  },
);
