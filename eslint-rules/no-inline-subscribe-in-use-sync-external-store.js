/**
 * Ported from `biome-plugins/no-inline-subscribe-in-use-sync-external-store.grit`.
 *
 * React calls `subscribe` again whenever its reference changes, so an inline
 * function unsubscribes and resubscribes on every render.
 *
 * See docs/dantotsus/usesyncexternal-store-subscribe-must-be-stable.md and
 * docs/standards/07-state-and-effects.md.
 */
const MESSAGE =
  'The `subscribe` argument to useSyncExternalStore must keep the same reference across ' +
  'renders, or React resubscribes on every render. Hoist the function to module scope, ' +
  'or wrap it in useCallback with the relevant dependencies. ' +
  'See docs/standards/07-state-and-effects.md.';

const INLINE_FUNCTION_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'FunctionDeclaration',
]);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require a stable subscribe argument to useSyncExternalStore.' },
    schema: [],
    messages: { inlineSubscribe: MESSAGE },
  },
  create(context) {
    return {
      CallExpression(node) {
        const isTargetCall =
          (node.callee.type === 'Identifier' && node.callee.name === 'useSyncExternalStore') ||
          (node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'useSyncExternalStore');
        if (!isTargetCall || node.arguments.length === 0) {
          return;
        }
        const subscribeArgument = node.arguments[0];
        if (INLINE_FUNCTION_TYPES.has(subscribeArgument.type)) {
          context.report({ node: subscribeArgument, messageId: 'inlineSubscribe' });
        }
      },
    };
  },
};
