import { isTestPath } from './impurity.js';

/**
 * The slice draws the ownership line for a table. While only
 * `punch.repository.ts` queries the punch tables, "what writes to this table"
 * is answered by opening one file, and a schema change has one place to look
 * for callers.
 *
 * Reaching into another slice's repository takes that ownership away silently,
 * and the reader who opens `punch.repository.ts` to audit the table now has an
 * incomplete answer with nothing in the file to say so. The way across a slice
 * boundary is the other slice's service, which is the layer that gets to
 * decide what a foreign caller may do.
 *
 * A repository import is cross slice exactly when the path leaves the folder,
 * so the rule reads the import source rather than comparing two directory
 * names.
 *
 * What this deliberately allows:
 *
 * - `./<domain>.repository`, which is the slice's own repository.
 * - A test, and the harness under `apps/<app>/test/`, because the back end
 *   end to end suite drives repositories directly against the real Postgres,
 *   across slices.
 * - `../<other>/<other>.service` and `../<other>/<other>.types`, which are the
 *   supported ways across a boundary.
 *
 * See docs/standards/04-backend-architecture.md.
 */
const MESSAGE =
  "A file may not import another slice's repository. The repository owns its tables, and a " +
  "foreign caller goes through that slice's service, which is the layer that decides what an " +
  'outsider may do. See docs/standards/04-backend-architecture.md.';

const CROSS_SLICE_REPOSITORY_PATTERN = /^\.\.\/.*\.repository(\.[jt]sx?)?$/;

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: "Forbid importing another slice's repository." },
    schema: [],
    messages: { crossSliceRepository: MESSAGE },
  },
  create(context) {
    if (isTestPath(context.filename)) {
      return {};
    }
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') {
          return;
        }
        if (CROSS_SLICE_REPOSITORY_PATTERN.test(source)) {
          context.report({ node: node.source, messageId: 'crossSliceRepository' });
        }
      },
    };
  },
};
