import { isTestPath } from './impurity.js';
import { toPosixPath } from './site-paths.js';

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
