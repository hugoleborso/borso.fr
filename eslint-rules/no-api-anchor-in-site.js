/**
 * Ported from `biome-plugins/no-api-anchor-in-site.grit`.
 *
 * Sibling of `no-direct-api-fetch-in-site` with the same root cause and a
 * different surface, which is a direct navigation target rather than a fetch
 * call. First seen in PR #27, where two CSV download buttons returned the 404
 * page on preview while the endpoint behind them returned 200.
 *
 * The grit version had to match `JsxString` nodes directly, because a JSX
 * attribute string is not a JavaScript string literal in biome's AST. ESLint's
 * JSX AST uses a plain `Literal` for the same position, so the check reads
 * more simply here.
 *
 * See docs/dantotsus/api-anchor-must-use-api-url-on-preview.md.
 */
const MESSAGE =
  'A bare `/api/...` string in a JSX attribute opens the static-site CloudFront ' +
  'distribution, which has no /api/* behaviour, and returns the 404 page on preview and ' +
  'production. Build the URL through the Hono client instead. ' +
  'See docs/standards/06-data-fetching.md.';

const API_PREFIX = '/api/';

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
