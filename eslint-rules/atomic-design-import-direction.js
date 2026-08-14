import { onEveryModuleSource } from './module-source.js';
import { readComponentBucket } from './site-paths.js';

/**
 * The three buckets only mean something while the dependency arrow points one
 * way. An atom that imports a molecule is no longer a primitive, because
 * reusing it drags a composition along, and a cycle between two components
 * becomes possible the moment the arrow can point both ways.
 *
 * The rule reads the importing file's path to decide which bucket it is in,
 * rather than inferring a role from what the file exports, so an atom that has
 * not yet grown a component child is still an atom.
 *
 * What this deliberately allows:
 *
 * - An import from the file's own bucket, e.g. an atom importing an atom. The
 *   standard calls a same folder import suspicious rather than wrong, and a
 *   lint rule cannot tell the two apart.
 * - Anything outside `components/`, e.g. `lib/`, `i18n/`, and a package.
 * - A path segment that merely starts with a bucket name, e.g.
 *   `../../lib/organisms-legend`, because the pattern requires the segment to
 *   end at a separator.
 *
 * A type only import is treated the same as a value import. It creates no
 * runtime cycle, and it still means the atom knows a molecule's shape, which
 * is the coupling the standard is about.
 *
 * See docs/standards/05-frontend-architecture.md.
 */
const MESSAGE =
  'A component in `{{importingBucket}}/` may not import from `{{importedBucket}}/`. The ' +
  'dependency arrow runs atoms to molecules to organisms and never back, which is what keeps ' +
  'the leaf components reusable and a cycle impossible. Move the shared piece down a bucket, ' +
  'or move this component up one. See docs/standards/05-frontend-architecture.md.';

const FORBIDDEN_BUCKETS_BY_BUCKET = new Map([
  ['atoms', ['molecules', 'organisms']],
  ['molecules', ['organisms']],
]);

function isImportOfBucket(source, bucket) {
  return new RegExp(String.raw`(^|/)${bucket}(/|$)`).test(source);
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Keep the atomic design dependency arrow pointing one way.' },
    schema: [],
    messages: { wrongDirection: MESSAGE },
  },
  create(context) {
    const importingBucket = readComponentBucket(context.filename);
    const forbiddenBuckets = FORBIDDEN_BUCKETS_BY_BUCKET.get(importingBucket);
    if (forbiddenBuckets === undefined) {
      return {};
    }
    return onEveryModuleSource((source, node) => {
      const importedBucket = forbiddenBuckets.find((bucket) => isImportOfBucket(source, bucket));
      if (importedBucket !== undefined) {
        context.report({
          node: node.source,
          messageId: 'wrongDirection',
          data: { importingBucket, importedBucket },
        });
      }
    });
  },
};
