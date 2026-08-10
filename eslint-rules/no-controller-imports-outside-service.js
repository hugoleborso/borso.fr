/**
 * Ported from `biome-plugins/no-controller-imports-outside-service.grit`.
 *
 * A controller may import its own service and schema, the shared auth
 * middleware, and third-party packages. Anything else, which includes a
 * repository, a core file, a helper, and another slice's service, is
 * re-exported through this slice's own service.
 *
 * The grit version matched every file in the repository and relied on the
 * import path shapes to imply a controller. Here the rule reads the file name,
 * so it fires only inside `*.controller.ts` and cannot misfire on a service
 * that legitimately imports a repository.
 *
 * See docs/standards/04-backend-architecture.md.
 */
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
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') {
          return;
        }
        if (FORBIDDEN_SOURCE_PATTERNS.some((pattern) => pattern.test(source))) {
          context.report({ node: node.source, messageId: 'forbiddenImport' });
        }
      },
    };
  },
};
