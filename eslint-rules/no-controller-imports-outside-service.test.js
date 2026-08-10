import { createRuleTester } from './rule-tester.js';
import rule from './no-controller-imports-outside-service.js';

const controllerFile = 'apps/pragma/api/src/songs/songs.controller.ts';
const serviceFile = 'apps/pragma/api/src/songs/songs.service.ts';

createRuleTester(controllerFile).run('no-controller-imports-outside-service', rule, {
  valid: [
    "import { songsService } from './songs.service';",
    "import { createSongSchema } from './songs.schema';",
    "import { requireSession } from '../auth/auth.middleware';",
    "import { Hono } from 'hono';",
    "import { zValidator } from '@hono/zod-validator';",
  ],
  invalid: [
    {
      code: "import { findSongById } from './songs.repository';",
      errors: [{ messageId: 'forbiddenImport' }],
    },
    {
      code: "import { transposeChart } from './tonality.core';",
      errors: [{ messageId: 'forbiddenImport' }],
    },
    {
      code: "import { presignUpload } from '../uploads/uploads.service';",
      errors: [{ messageId: 'forbiddenImport' }],
    },
    {
      code: "import { toRunnerDto } from './runner.dto.utils';",
      errors: [{ messageId: 'forbiddenImport' }],
    },
    {
      code: "import { readGpx } from '../helpers/gpx/gpx.core';",
      errors: [{ messageId: 'forbiddenImport' }],
    },
    {
      code: "import { database } from '../database/client';",
      errors: [{ messageId: 'forbiddenImport' }],
    },
  ],
});

// A service may import everything the controller may not, so the rule has to
// stay silent outside `*.controller.ts`.
createRuleTester(serviceFile).run('no-controller-imports-outside-service (service file)', rule, {
  valid: [
    "import { findSongById } from './songs.repository';",
    "import { transposeChart } from './tonality.core';",
    "import { readGpx } from '../helpers/gpx/gpx.core';",
  ],
  invalid: [],
});
