import { createRuleTester } from './rule-tester.js';
import rule from './no-adapter-import-in-pure-module.js';

const coreFile = 'apps/pragma/api/src/songs/musicbrainz.core.ts';
const utilsFile = 'apps/pragma/site/src/lib/mastery-aggregate.utils.ts';
const adapterFile = 'apps/pragma/api/src/songs/musicbrainz.adapter.ts';
const serviceFile = 'apps/pragma/api/src/songs/songs.service.ts';
const coreTestFile = 'apps/pragma/api/src/songs/musicbrainz.core.test.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(coreFile, { jsx: false }).run('no-adapter-import-in-pure-module (core)', rule, {
  valid: [
    "import { rankExternalHits } from './search-ranking.core';",
    "import { toEntryPatch } from '../setlists/setlists.utils';",
    "import { adapterRegistry } from './adapters-registry';",
  ],
  invalid: [
    {
      code: "import { searchExternal } from './musicbrainz.adapter';",
      errors: [{ messageId: 'adapterInPureModule' }],
    },
    {
      code: "import { presignPutObject } from '../uploads/uploads.adapter';",
      errors: [{ messageId: 'adapterInPureModule' }],
    },
    {
      code: "import type { ExternalFetcher } from './musicbrainz.adapter';",
      errors: [{ messageId: 'adapterInPureModule' }],
    },
    {
      code: "import { presign } from './uploads.adapter.js';",
      errors: [{ messageId: 'adapterInPureModule' }],
    },
  ],
});

createRuleTester(utilsFile, { jsx: false }).run('no-adapter-import-in-pure-module (utils)', rule, {
  valid: ["import { meanForSong } from './mastery.core';"],
  invalid: [
    {
      code: "import { hasSentFileToPresignedUrl } from './object-upload.adapter';",
      errors: [{ messageId: 'adapterInPureModule' }],
    },
  ],
});

createRuleTester(adapterFile, { jsx: false }).run(
  'no-adapter-import-in-pure-module (adapter)',
  rule,
  {
    valid: [
      "import { mapMusicBrainzRecordings } from './musicbrainz.core';",
      "import { searchExternal } from './other.adapter';",
    ],
    invalid: [],
  },
);

createRuleTester(serviceFile, { jsx: false }).run(
  'no-adapter-import-in-pure-module (service)',
  rule,
  {
    valid: ["import { searchExternal } from './musicbrainz.adapter';"],
    invalid: [],
  },
);

createRuleTester(coreTestFile, { jsx: false }).run(
  'no-adapter-import-in-pure-module (test)',
  rule,
  {
    valid: ["import { searchExternal } from './musicbrainz.adapter';"],
    invalid: [],
  },
);
