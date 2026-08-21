import { onEveryModuleSource } from './module-source.js';
import { isTestPath } from './impurity.js';

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
    return onEveryModuleSource((source, node) => {
      if (CROSS_SLICE_REPOSITORY_PATTERN.test(source)) {
        context.report({ node: node.source, messageId: 'crossSliceRepository' });
      }
    });
  },
};
