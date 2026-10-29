const MESSAGE =
  'A `ref` callback must keep the same reference across renders. An inline one is a new ' +
  'function on every render, so React calls the old one with null, or under React 19 runs ' +
  'the cleanup it returned, on every commit. Hoist it to module scope, or wrap it in ' +
  'useCallback. See docs/standards/07-state-and-effects.md.';

const INLINE_FUNCTION_TYPES = new Set(['ArrowFunctionExpression', 'FunctionExpression']);

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require a stable function as a JSX ref callback.' },
    schema: [],
    messages: { inlineRefCallback: MESSAGE },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'ref') {
          return;
        }
        if (node.value?.type !== 'JSXExpressionContainer') {
          return;
        }
        if (INLINE_FUNCTION_TYPES.has(node.value.expression.type)) {
          context.report({ node: node.value.expression, messageId: 'inlineRefCallback' });
        }
      },
    };
  },
};
