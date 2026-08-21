import { isTestPath } from './impurity.js';
import { isTypeOnlyModuleSource, onEveryModuleSource } from './module-source.js';
import { toPosixPath } from './site-paths.js';

const MESSAGE =
  'Only a `*.repository.ts` file may import the database client. Move the query into the ' +
  "slice's repository and call it from the service, so the tables have one owner. A type only " +
  'import of `Database` is allowed, since it carries no query. ' +
  'See docs/standards/11-database.md.';

const DATABASE_CLIENT_PATTERN = /(^|\/)database\/client(\.[jt]sx?)?$/;

const REPOSITORY_FILE_PATTERN = /\.repository\.tsx?$/;

const DATABASE_CLIENT_FILE_PATTERN = /(^|\/)database\/client\.tsx?$/;

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Keep the database client import inside repositories.' },
    schema: [],
    messages: { databaseClientOutsideRepository: MESSAGE },
  },
  create(context) {
    const filename = toPosixPath(context.filename);
    if (
      REPOSITORY_FILE_PATTERN.test(filename) ||
      DATABASE_CLIENT_FILE_PATTERN.test(filename) ||
      isTestPath(filename)
    ) {
      return {};
    }
    return onEveryModuleSource((source, node) => {
      if (!DATABASE_CLIENT_PATTERN.test(source) || isTypeOnlyModuleSource(node)) {
        return;
      }
      context.report({ node: node.source, messageId: 'databaseClientOutsideRepository' });
    });
  },
};
