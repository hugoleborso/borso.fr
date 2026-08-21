const MESSAGE =
  'Direct fetch() on a relative `/api/...` URL bypasses the Hono client and hits the ' +
  'static-site CloudFront distribution, which has no /api/* behaviour, on preview and ' +
  'production. Use the typed `api.*` client from `lib/api.ts`. ' +
  'See docs/standards/06-data-fetching.md.';

const API_PREFIX = '/api/';

function readStaticUrl(node) {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === 'TemplateLiteral' && node.quasis.length > 0) {
    return node.quasis[0].value.cooked;
  }
  return null;
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid fetch() against a relative /api/ URL in site code.' },
    schema: [],
    messages: { directFetch: MESSAGE },
  },
  create(context) {
    return {
      CallExpression(node) {
        const isFetchCall =
          (node.callee.type === 'Identifier' && node.callee.name === 'fetch') ||
          (node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'fetch');
        if (!isFetchCall || node.arguments.length === 0) {
          return;
        }
        const url = readStaticUrl(node.arguments[0]);
        if (url !== null && url.startsWith(API_PREFIX)) {
          context.report({ node: node.arguments[0], messageId: 'directFetch' });
        }
      },
    };
  },
};
