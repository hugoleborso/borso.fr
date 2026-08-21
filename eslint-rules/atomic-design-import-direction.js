import { onEveryModuleSource } from './module-source.js';
import { readComponentBucket } from './site-paths.js';

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
