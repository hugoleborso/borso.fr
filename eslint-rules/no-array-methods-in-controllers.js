import { isControllerFile } from './impurity.js';

/**
 * A controller handler does three things, which are validating the input,
 * calling one service method, and shaping the response. An iteration over
 * domain data is none of the three, and it is the shape a controller grows
 * before it turns into a service nobody has extracted yet.
 *
 * The same iteration inside the service can be tested through the service's
 * public method, and moved from there into a `.core.ts` function that is
 * covered exhaustively. Inside the controller it can only be tested through
 * HTTP.
 *
 * `find` is the one ambiguous name, because `songsService.find(songId)` is a
 * lookup and not `Array#find`, so it is reported only when the first argument
 * is a function, which is what every array callback is. The other five names
 * are reported whatever the argument, since a domain method called `filter` or
 * `reduce` is not something this repository has.
 *
 * What this deliberately allows:
 *
 * - `find` with a non-callback argument, e.g. a repository or service lookup.
 * - Anything outside `*.controller.ts`, including the sibling test.
 * - `map` on a `Map`, which is not a method `Map` has, so the point is moot.
 *
 * See docs/standards/04-backend-architecture.md.
 */
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
