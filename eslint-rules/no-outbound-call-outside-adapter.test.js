import { createRuleTester } from './rule-tester.js';
import rule from './no-outbound-call-outside-adapter.js';

const serviceFile = 'apps/pragma/api/src/songs/songs.service.ts';
const adapterFile = 'apps/pragma/api/src/songs/musicbrainz.adapter.ts';
const databaseClientFile = 'apps/pragma/api/src/database/client.ts';
const testFile = 'apps/pragma/api/src/songs/songs.service.test.ts';
const toolingFile = 'scripts/architecture/architecture-graph.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(serviceFile).run('no-outbound-call-outside-adapter (service)', rule, {
  valid: [
    'const hits = await searchExternal(query);',
    'const rows = await database.select().from(songTable);',
    'const parsed = fetcher(url, {});',
  ],
  invalid: [
    {
      code: "const response = await fetch('https://musicbrainz.org');",
      errors: [{ messageId: 'outboundCallOutsideAdapter', data: { what: 'the fetch' } }],
    },
    {
      code: "const client = new S3Client({ region: 'eu-west-3' });",
      errors: [{ messageId: 'outboundCallOutsideAdapter', data: { what: 'the S3Client' } }],
    },
    {
      code: 'const bus = new EventBridgeClient({});',
      errors: [
        { messageId: 'outboundCallOutsideAdapter', data: { what: 'the EventBridgeClient' } },
      ],
    },
  ],
});

createRuleTester(adapterFile).run('no-outbound-call-outside-adapter (adapter)', rule, {
  valid: [
    'const response = await fetch(url, { headers });',
    'const client = new S3Client({ region });',
  ],
  invalid: [],
});

createRuleTester(databaseClientFile).run(
  'no-outbound-call-outside-adapter (database client)',
  rule,
  {
    valid: ['const token = await signer.getDbConnectAdminAuthToken();', 'await fetch(url);'],
    invalid: [],
  },
);

createRuleTester(testFile).run('no-outbound-call-outside-adapter (test)', rule, {
  valid: ["const response = await fetch('https://example.test');"],
  invalid: [],
});

createRuleTester(toolingFile).run('no-outbound-call-outside-adapter (tooling)', rule, {
  valid: ["const response = await fetch('https://example.test');"],
  invalid: [],
});
