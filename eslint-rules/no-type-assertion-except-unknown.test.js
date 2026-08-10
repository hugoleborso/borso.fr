import { createRuleTester } from './rule-tester.js';
import rule from './no-type-assertion-except-unknown.js';

createRuleTester().run('no-type-assertion-except-unknown', rule, {
  valid: [
    'const parsed = JSON.parse(raw) as unknown;',
    "const kinds = ['a', 'b'] as const;",
    'const runner = runnerSchema.parse(payload);',
    'function isFinished(entry: Entry): entry is FinishedEntry { return entry.kind === "finished"; }',
  ],
  invalid: [
    { code: 'const runner = payload as Runner;', errors: [{ messageId: 'restricted' }] },
    {
      code: 'const runner = payload as unknown as Runner;',
      errors: [{ messageId: 'restricted' }],
    },
    { code: 'const count = value as number;', errors: [{ messageId: 'restricted' }] },
    { code: 'const rows = value as Array<Runner>;', errors: [{ messageId: 'restricted' }] },
  ],
});

// The angle bracket form only parses when JSX is off, which is the case for
// every `.ts` file on the back end.
createRuleTester('apps/pragma/api/src/songs/songs.core.ts', { jsx: false }).run(
  'no-type-assertion-except-unknown (angle bracket form)',
  rule,
  {
    valid: ['const parsed = JSON.parse(raw) as unknown;'],
    invalid: [{ code: 'const runner = <Runner>payload;', errors: [{ messageId: 'restricted' }] }],
  },
);
