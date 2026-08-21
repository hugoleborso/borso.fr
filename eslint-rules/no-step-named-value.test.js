import { createRuleTester } from './rule-tester.js';
import rule from './no-step-named-value.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-step-named-value', rule, {
  valid: [
    'const namedSong = songWriteVariablesSchema.safeParse(variables);',
    'const rankedRunners = rank(progresses);',
    'const sessionPayloadBytes = encode(session);',
    'for (const entry of songWrites) { total += entry.score; }',
    'for (const item in lookup) { count += 1; }',
    'const { data } = useSongsList();',
    'const { result, payload } = await callTheThing();',
    'const song = response.data;',
    'return { result: total };',
  ],
  invalid: [
    {
      code: 'const parsed = schema.safeParse(variables);',
      errors: [{ messageId: 'stepNamed', data: { name: 'parsed' } }],
    },
    {
      code: 'const result = progresses.reduce(rank, seed);',
      errors: [{ messageId: 'stepNamed' }],
    },
    {
      code: 'let entries = [];',
      errors: [{ messageId: 'stepNamed' }],
    },
    {
      code: 'const payload = { id, title };',
      errors: [{ messageId: 'stepNamed' }],
    },
    {
      code: 'const data = await readEverything();',
      errors: [{ messageId: 'stepNamed' }],
    },
  ],
});
