import { forEachDescendant } from './ast-walk.js';

const MESSAGE =
  'A mutation carrying `onMutate` already wrote the state it predicted, so refetching from the ' +
  'same mutation adds no data and can revert the user interface: an immediate `GET` after the ' +
  'write may be served by another Lambda on another DSQL connection that still sees the ' +
  'pre-commit snapshot. Reconcile from the mutation response instead. If one key really does ' +
  'hold a projection the client cannot predict, refetch that key alone and say so with an ' +
  '`eslint-disable-next-line` reason. See docs/standards/06-data-fetching.md.';

const REFETCHING_METHOD_NAMES = new Set(['invalidateQueries', 'refetchQueries']);

const FUNCTION_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'FunctionDeclaration',
]);

function isRefetchingCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    REFETCHING_METHOD_NAMES.has(node.callee.property.name)
  );
}

function calledName(node) {
  return node.type === 'CallExpression' && node.callee.type === 'Identifier'
    ? node.callee.name
    : null;
}

function declaredFunctionName(node) {
  if (node.type === 'FunctionDeclaration' && node.id !== null) return node.id.name;
  if (
    node.type === 'VariableDeclarator' &&
    node.id.type === 'Identifier' &&
    node.init !== null &&
    FUNCTION_TYPES.has(node.init.type)
  ) {
    return node.id.name;
  }
  return null;
}

function containsRefetch(node, refetchingHelperNames) {
  let found = isRefetchingCall(node) || refetchingHelperNames.has(calledName(node));
  forEachDescendant(node, (descendant) => {
    found ||= isRefetchingCall(descendant) || refetchingHelperNames.has(calledName(descendant));
  });
  return found;
}

function mutationOptionsOf(node) {
  const isMutationCall =
    (node.callee.type === 'Identifier' && node.callee.name === 'useMutation') ||
    (node.callee.type === 'MemberExpression' &&
      node.callee.property.type === 'Identifier' &&
      node.callee.property.name === 'useMutation');
  if (!isMutationCall) return null;
  const [options] = node.arguments;
  return options !== undefined && options.type === 'ObjectExpression' ? options : null;
}

function hasOptimisticWrite(options) {
  return options.properties.some(
    (property) =>
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      property.key.name === 'onMutate',
  );
}

/**
 * @Blueprint lint-rule-transitive-call
 * @BlueprintName Transitive Call Detection
 * @BlueprintUsage Use when a rule bans an operation that a helper in the same file can perform on the banned site's behalf.
 * @BlueprintDescription Names every same-file function whose body performs the banned operation, and only then walks the banned sites, treating a call to one of those names exactly like the operation itself. Deciding at `Program:exit` is what lets a helper declared below its caller count, and it is what stops the rule being defeated by the move a reader makes when a linter complains, which is to extract the call and give the helper a name asserting a scoping its body does not have.
 */
// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Reject a refetch fired by the same mutation that optimistically wrote the cache.',
    },
    schema: [],
    messages: { refetchAfterOptimisticWrite: MESSAGE },
  },
  create(context) {
    const refetchingHelperNames = new Set();
    const optimisticMutationOptions = [];

    return {
      ':function'(node) {
        const name = declaredFunctionName(node.parent) ?? declaredFunctionName(node);
        if (name !== null && containsRefetch(node, new Set())) refetchingHelperNames.add(name);
      },
      CallExpression(node) {
        const options = mutationOptionsOf(node);
        if (options !== null && hasOptimisticWrite(options))
          optimisticMutationOptions.push(options);
      },
      'Program:exit'() {
        for (const options of optimisticMutationOptions) {
          if (!containsRefetch(options, refetchingHelperNames)) continue;
          context.report({ node: options, messageId: 'refetchAfterOptimisticWrite' });
        }
      },
    };
  },
};
