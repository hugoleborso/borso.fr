import { isTestPath } from './impurity.js';
import { toPosixPath } from './site-paths.js';

/**
 * Drizzle derives the row types from the table definitions, so a renamed
 * column becomes a TypeScript error in every file that reads it. A raw `sql`
 * fragment opts out of that, and the same rename becomes a runtime error on
 * the first request that touches the statement.
 *
 * A repository still needs the escape hatch, e.g. for a window function or a
 * Postgres feature the query builder does not model, and it is the one file
 * where a reviewer can check the statement against the schema next to it. A
 * generated migration is raw SQL by definition.
 *
 * What this deliberately allows:
 *
 * - `*.repository.ts` and anything under a `migrations/` folder.
 * - A test, and the harness under `apps/<app>/test/`, since the back end end
 *   to end suite creates the schema and truncates tables between suites and
 *   there is no repository method for either.
 * - Another tagged template, e.g. `html` or `css`, because only a tag named
 *   `sql` is matched.
 * - A plain string that happens to contain SQL, which no tool can tell from
 *   prose.
 *
 * See docs/standards/11-database.md.
 */
const MESSAGE =
  'Raw SQL belongs in a repository or a generated migration. Elsewhere it opts out of the ' +
  'types Drizzle derives from the table definitions, so a renamed column becomes a runtime ' +
  'error rather than a compile error. Move the statement into `<domain>.repository.ts`. ' +
  'See docs/standards/11-database.md.';

const SQL_TAG_NAME = 'sql';

const REPOSITORY_FILE_PATTERN = /\.repository\.tsx?$/;

const MIGRATION_PATH_PATTERN = /(^|\/)migrations\//;

function isSqlIdentifier(node) {
  return node.type === 'Identifier' && node.name === SQL_TAG_NAME;
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Keep raw SQL inside repositories and migrations.' },
    schema: [],
    messages: { rawSql: MESSAGE },
  },
  create(context) {
    const filename = toPosixPath(context.filename);
    if (
      REPOSITORY_FILE_PATTERN.test(filename) ||
      MIGRATION_PATH_PATTERN.test(filename) ||
      isTestPath(filename)
    ) {
      return {};
    }
    return {
      TaggedTemplateExpression(node) {
        if (isSqlIdentifier(node.tag)) {
          context.report({ node, messageId: 'rawSql' });
        }
      },
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression' && isSqlIdentifier(node.callee.object)) {
          context.report({ node, messageId: 'rawSql' });
        }
      },
    };
  },
};
