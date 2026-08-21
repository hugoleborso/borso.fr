import { onEveryModuleSource } from './module-source.js';

const MESSAGE =
  'A controller may import only its own `<domain>.service`, its own `<domain>.schema`, the ' +
  'auth middleware, and third-party packages. Re-export anything else, which includes ' +
  "domain types, helpers, and error classes from other slices, through this slice's own " +
  'service. See docs/standards/04-backend-architecture.md.';

const FORBIDDEN_SOURCE_PATTERNS = [
  /\.repository$/,
  /\.core$/,
  /\.dto\.utils$/,
  /\.s3$/,
  /^\.\.\/helpers\//,
  /^\.\.\/[^/]+\/[^/]+\.service$/,
  /database\/client$/,
];

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Keep controller imports inside the slice.' },
    schema: [],
    messages: { forbiddenImport: MESSAGE },
  },
  create(context) {
    if (!context.filename.endsWith('.controller.ts')) {
      return {};
    }
    return onEveryModuleSource((source, node) => {
      if (FORBIDDEN_SOURCE_PATTERNS.some((pattern) => pattern.test(source))) {
        context.report({ node: node.source, messageId: 'forbiddenImport' });
      }
    });
  },
};
