import { createRuleTester } from './rule-tester.js';
import rule from './no-abbreviated-identifier.js';

// @FollowsBlueprint test-lint-rule
createRuleTester('apps/pragma/api/src/songs/songs.service.ts', { jsx: false }).run(
  'no-abbreviated-identifier',
  rule,
  {
    valid: [
      'const applicationConfiguration = loadApplicationConfiguration();',
      'const migrationDigest = digestMigrations(migrationFiles);',
      'const resource = await findResource(resourceId);',
      'const messages = [];',
      'const previousLap = laps.at(-1);',
      'const currency = "EUR";',
      'const numbers = [1, 2, 3];',
      'const duration = 12;',
      'const position = 3;',
      'const attribute = "role";',
      'const description = "";',
      'const quantity = 2;',
      'const objective = "finish";',
      'const strategy = "steady";',
      'const id = createRunnerId();',
      'const url = new URL(base);',
      'const bpm = 120;',
      'const lat = 48.85;',
      'const dto = toRunnerDto(runner);',
      'for (let i = 0; i < total; i += 1) { count += i; }',
      'for (const x of entries) { total += x; }',
      "import { cb } from 'external-library';",
      'const { req } = context;',
      'const body = context.req.valid("json");',
      'const payload = { cfg: 1, msg: "hello" };',
      'const [, _unused] = pair;',
      'function ignore(_) { return null; }',
    ],
    invalid: [
      {
        code: 'const cfg = loadConfig();',
        errors: [{ messageId: 'abbreviation', data: { name: 'cfg', segment: 'cfg' } }],
      },
      { code: 'const msgText = "";', errors: [{ messageId: 'abbreviation' }] },
      { code: 'const idx = 0;', errors: [{ messageId: 'abbreviation' }] },
      { code: 'const previousIdx = 0;', errors: [{ messageId: 'abbreviation' }] },
      { code: 'const arr = [];', errors: [{ messageId: 'abbreviation' }] },
      { code: 'const durSeconds = 1;', errors: [{ messageId: 'abbreviation' }] },
      { code: 'function digest(val) { return val; }', errors: [{ messageId: 'abbreviation' }] },
      {
        code: 'const compute = (obj, fn) => fn(obj);',
        errors: [{ messageId: 'abbreviation' }, { messageId: 'abbreviation' }],
      },
      {
        code: 'try { run(); } catch (err) { report(err); }',
        errors: [{ messageId: 'abbreviation' }],
      },
      { code: 'class BtnRenderer {}', errors: [{ messageId: 'abbreviation' }] },
      { code: 'const x = 1;', errors: [{ messageId: 'tooShort', data: { name: 'x' } }] },
      {
        code: 'function at(p) { return p; }',
        errors: [{ messageId: 'tooShort' }, { messageId: 'tooShort' }],
      },
      {
        code: 'for (const entry of entries) { const i = entry.index; }',
        errors: [{ messageId: 'tooShort' }],
      },
    ],
  },
);

createRuleTester('apps/pragma/api/src/songs/songs.service.ts', { jsx: false }).run(
  'no-abbreviated-identifier (options)',
  rule,
  {
    valid: [
      { code: 'const db = getDatabase();', options: [{}] },
      { code: 'const bpmValue = 120;', options: [{ additionalAbbreviations: ['xyz'] }] },
      { code: 'const rpc = createClient();', options: [{ additionalAllowedNames: ['rpc'] }] },
    ],
    invalid: [
      {
        code: 'const xyz = 1;',
        options: [{ additionalAbbreviations: ['xyz'] }],
        errors: [{ messageId: 'abbreviation' }],
      },
    ],
  },
);
