import { isTestPath } from './impurity.js';
import { toPosixPath } from './site-paths.js';

/**
 * Keeping the client import inside repositories is what makes "what writes to
 * this table" a one file question. A service that reaches for `getDatabase()`
 * writes a query nobody will find when the column is renamed, and a controller
 * that does it has skipped both other layers.
 *
 * The rule allows a type only import, because `import type { Database }` names
 * the handle a repository method takes as an argument, and every service and
 * controller that passes one along needs the type. The type carries no query
 * and disappears at compile time, so it is not the client.
 *
 * A re-export is an import and an export in one statement, so
 * `export { getDatabase } from '../database/client'` is checked exactly like
 * the import it contains. Without that, a service could re-export the client
 * and every controller downstream would import it from a path this rule does
 * not recognise, which is how a controller ended up opening the database.
 *
 * What this deliberately allows:
 *
 * - `*.repository.ts`, which is the layer that owns the client, and
 *   `database/client.ts` itself.
 * - `import type { Database } from '../database/client'`, and an import whose
 *   specifiers are all `type` specifiers.
 * - `../database/schema`, which is table definitions rather than a connection.
 * - A test, and the harness under `apps/<app>/test/`, which builds the test
 *   database the back end end to end suite runs against.
 *
 * See docs/standards/11-database.md and
 * docs/standards/04-backend-architecture.md.
 */
const MESSAGE =
  'Only a `*.repository.ts` file may import the database client. Move the query into the ' +
  "slice's repository and call it from the service, so the tables have one owner. A type only " +
  'import of `Database` is allowed, since it carries no query. ' +
  'See docs/standards/11-database.md.';

const DATABASE_CLIENT_PATTERN = /(^|\/)database\/client(\.[jt]sx?)?$/;

const REPOSITORY_FILE_PATTERN = /\.repository\.tsx?$/;

const DATABASE_CLIENT_FILE_PATTERN = /(^|\/)database\/client\.tsx?$/;

/**
 * An import declaration carries `importKind`, a re-export carries `exportKind`,
 * and the specifiers of either can be individually marked `type`.
 */
function isTypeOnly(node) {
  if (node.importKind === 'type' || node.exportKind === 'type') {
    return true;
  }
  const specifiers = node.specifiers ?? [];
  const valueSpecifiers = specifiers.filter(
    (specifier) => (specifier.importKind ?? specifier.exportKind ?? 'value') === 'value',
  );
  return specifiers.length > 0 && valueSpecifiers.length === 0;
}

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
    function reportWhenClientIsReached(node) {
      const source = node.source?.value;
      if (typeof source !== 'string' || !DATABASE_CLIENT_PATTERN.test(source)) {
        return;
      }
      if (isTypeOnly(node)) {
        return;
      }
      context.report({ node: node.source, messageId: 'databaseClientOutsideRepository' });
    }

    return {
      ImportDeclaration: reportWhenClientIsReached,
      ExportNamedDeclaration: reportWhenClientIsReached,
      ExportAllDeclaration: reportWhenClientIsReached,
    };
  },
};
