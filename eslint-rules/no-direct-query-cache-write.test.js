import { createRuleTester } from './rule-tester.js';
import rule from './no-direct-query-cache-write.js';

const QUERY_MODULE = 'apps/pragma/site/src/lib/queries/songs.queries.ts';
const CACHE_WRITE_MODULE = 'apps/pragma/site/src/lib/queries/cache-write.queries.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(QUERY_MODULE, { jsx: false }).run('no-direct-query-cache-write', rule, {
  valid: [
    'writeKeepingStaleness(queryClient, songKeys.list(), (old) => old);',
    'writeEachKeepingStaleness(queryClient, takeKeys.ofSessions(), (cache) => cache);',
    'const previous = queryClient.getQueryData(songKeys.list());',
    'queryClient.setQueryDefaults(songKeys.all, { staleTime: 0 });',
    'queryClient[method](songKeys.list(), next);',
    'queryClient["getQueryData"](songKeys.list());',
    'setQueryData(songKeys.list(), next);',
  ],
  invalid: [
    {
      code: 'queryClient.setQueryData(songKeys.list(), next);',
      errors: [{ messageId: 'directCacheWrite', data: { method: 'setQueryData' } }],
    },
    {
      code: 'queryClient.setQueryData<SongsListResponse>(songKeys.list(), (old) => old);',
      errors: [{ messageId: 'directCacheWrite', data: { method: 'setQueryData' } }],
    },
    {
      code: 'write.queryClient.setQueryData(audienceKeys.ballot(sessionId), minted);',
      errors: [{ messageId: 'directCacheWrite', data: { method: 'setQueryData' } }],
    },
    {
      code: 'queryClient["setQueryData"](songKeys.list(), next);',
      errors: [{ messageId: 'directCacheWrite', data: { method: 'setQueryData' } }],
    },
    {
      code: 'queryClient.setQueriesData({ queryKey: takeKeys.ofSessions() }, (cache) => cache);',
      errors: [{ messageId: 'directCacheWrite', data: { method: 'setQueriesData' } }],
    },
  ],
});

createRuleTester(CACHE_WRITE_MODULE, { jsx: false }).run(
  'no-direct-query-cache-write (the cache write module)',
  rule,
  {
    valid: ['queryClient.setQueryData<Data>(queryKey, update);'],
    invalid: [],
  },
);
