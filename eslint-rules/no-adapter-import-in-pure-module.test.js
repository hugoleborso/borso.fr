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
    // The word appears in the name without being the suffix.
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
    // A type-only import still names the module, and the next edit drops the
    // `type` keyword without anyone noticing the file stopped being pure.
    {
      code: "import type { ExternalFetcher } from './musicbrainz.adapter';",
      errors: [{ messageId: 'adapterInPureModule' }],
    },
    // `infra/` emits ESM, so its specifiers carry the compiled extension.
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

// An adapter leaning on pure logic is the pattern, not a violation.
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

// Everything impure may reach an adapter; that is what an adapter is for.
createRuleTester(serviceFile, { jsx: false }).run(
  'no-adapter-import-in-pure-module (service)',
  rule,
  {
    valid: ["import { searchExternal } from './musicbrainz.adapter';"],
    invalid: [],
  },
);

// A pure module's test drives the adapter's stub, which is how it is written.
createRuleTester(coreTestFile, { jsx: false }).run(
  'no-adapter-import-in-pure-module (test)',
  rule,
  {
    valid: ["import { searchExternal } from './musicbrainz.adapter';"],
    invalid: [],
  },
);
