import { isControllerFile } from './impurity.js';

const MESSAGE =
  'A controller may not call `{{method}}` over domain data. A handler validates the input, ' +
  'calls one service method, and shapes the response, so move the iteration into ' +
  '`<domain>.service.ts`, and move the rule it applies into `<domain>.core.ts` where it is ' +
  'covered exhaustively. See docs/standards/04-backend-architecture.md.';

const ARRAY_METHODS = new Set(['map', 'filter', 'reduce', 'some', 'every']);

const AMBIGUOUS_ARRAY_METHOD = 'find';

const FUNCTION_ARGUMENT_TYPES = new Set(['ArrowFunctionExpression', 'FunctionExpression']);

function isArrayMethodCall(node, methodName) {
  if (ARRAY_METHODS.has(methodName)) {
    return true;
  }
  if (methodName !== AMBIGUOUS_ARRAY_METHOD || node.arguments.length === 0) {
    return false;
  }
  return FUNCTION_ARGUMENT_TYPES.has(node.arguments[0].type);
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid array iteration over domain data in a controller.' },
    schema: [],
    messages: { arrayMethodInController: MESSAGE },
  },
  create(context) {
    if (!isControllerFile(context.filename)) {
      return {};
    }
    return {
      CallExpression(node) {
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.computed ||
          node.callee.property.type !== 'Identifier'
        ) {
          return;
        }
        const method = node.callee.property.name;
        if (isArrayMethodCall(node, method)) {
          context.report({
            node: node.callee.property,
            messageId: 'arrayMethodInController',
            data: { method },
          });
        }
      },
    };
  },
};
