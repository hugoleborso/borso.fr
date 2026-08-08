import { createRuleTester } from './rule-tester.js';
import rule from './no-raw-sql-outside-migrations.js';

const serviceFile = 'apps/last-loop-lepin/api/src/punch/punch.service.ts';
const repositoryFile = 'apps/last-loop-lepin/api/src/punch/punch.repository.ts';

createRuleTester(serviceFile, { jsx: false }).run('no-raw-sql-outside-migrations', rule, {
  valid: [
    'const punches = await punchRepository.listForRunner(runnerId);',
    // Another tagged template.
    'const markup = html`<p>${title}</p>`;',
    // A string that happens to hold SQL, which no tool can tell from prose.
    'const description = "DELETE FROM loop_punches removes every punch";',
    // A property named `sql` rather than the Drizzle tag.
    'logger.info(report.sql);',
    // A member call on something else entirely.
    'const rows = await database.select().from(punchesTable);',
  ],
  invalid: [
    {
      code: 'await database.execute(sql`DELETE FROM loop_punches WHERE edition_slug = ${slug}`);',
      errors: [{ messageId: 'rawSql' }],
    },
    {
      code: 'const fragment = sql.raw(statement);',
      errors: [{ messageId: 'rawSql' }],
    },
    {
      code: 'const clause = sql`count(*)::int`;',
      errors: [{ messageId: 'rawSql' }],
    },
  ],
});

// A repository is where the escape hatch belongs, next to the schema a
// reviewer checks the statement against.
createRuleTester(repositoryFile, { jsx: false }).run(
  'no-raw-sql-outside-migrations (repository file)',
  rule,
  {
    valid: [
      'const rows = await database.execute(sql`select count(*) from loop_punches`);',
      'const fragment = sql.raw(statement);',
    ],
    invalid: [],
  },
);

// The back end end to end suite truncates tables between tests, and there is
// no repository method for that.
createRuleTester('apps/last-loop-lepin/api/src/punch/punch.repository.test.ts', {
  jsx: false,
}).run('no-raw-sql-outside-migrations (test file)', rule, {
  valid: ['await database.execute(sql`TRUNCATE loop_punches`);'],
  invalid: [],
});

// The harness that creates the schema and truncates tables between suites.
createRuleTester('apps/last-loop-lepin/test/setup-postgres.ts', { jsx: false }).run(
  'no-raw-sql-outside-migrations (test harness)',
  rule,
  {
    valid: ['await database.execute(sql`CREATE SCHEMA IF NOT EXISTS app`);'],
    invalid: [],
  },
);

createRuleTester('apps/last-loop-lepin/api/src/database/migrations/apply.ts', { jsx: false }).run(
  'no-raw-sql-outside-migrations (migration folder)',
  rule,
  {
    valid: ['await database.execute(sql`select pg_advisory_lock(${lockKey})`);'],
    invalid: [],
  },
);
