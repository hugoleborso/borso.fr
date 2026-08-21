const MESSAGE =
  'A bare `/api/...` string in a JSX attribute opens the static-site CloudFront ' +
  'distribution, which has no /api/* behaviour, and returns the 404 page on preview and ' +
  'production. Build the URL through the Hono client instead. ' +
  'See docs/standards/06-data-fetching.md.';

const API_PREFIX = '/api/';

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid a literal /api/ URL in a JSX attribute.' },
    schema: [],
    messages: { apiAnchor: MESSAGE },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const value = node.value;
        if (value === null) {
          return;
        }
        if (value.type === 'Literal' && typeof value.value === 'string') {
          if (value.value.startsWith(API_PREFIX)) {
            context.report({ node: value, messageId: 'apiAnchor' });
          }
          return;
        }
        if (
          value.type === 'JSXExpressionContainer' &&
          value.expression.type === 'Literal' &&
          typeof value.expression.value === 'string' &&
          value.expression.value.startsWith(API_PREFIX)
        ) {
          context.report({ node: value.expression, messageId: 'apiAnchor' });
        }
      },
    };
  },
};
