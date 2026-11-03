const MESSAGE =
  'This mutation writes the cache optimistically in `onMutate` but declares no `scope`, so two ' +
  'quick calls send two requests at once and the server may commit them in the other order. ' +
  'The client never refetches the key it wrote, so it keeps showing the order it sent while the ' +
  'server keeps the older one, and the next visit shows the user their change undone. Give the ' +
  'mutation a `scope: { id }` shared by every mutation that writes the same records, so TanStack ' +
  'Query sends each request only after the previous answer. `onMutate` still runs at once. ' +
  'See docs/standards/06-data-fetching.md.';

function isMutationCall(node) {
  return (
    (node.callee.type === 'Identifier' && node.callee.name === 'useMutation') ||
    (node.callee.type === 'MemberExpression' &&
      node.callee.property.type === 'Identifier' &&
      node.callee.property.name === 'useMutation')
  );
}

function hasProperty(options, name) {
  return options.properties.some(
    (property) =>
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      property.key.name === name,
  );
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require a `scope` on every mutation that writes the cache in `onMutate`.',
    },
    schema: [],
    messages: { optimisticMutationWithoutScope: MESSAGE },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isMutationCall(node)) return;
        const [options] = node.arguments;
        if (options === undefined || options.type !== 'ObjectExpression') return;
        if (!hasProperty(options, 'onMutate') || hasProperty(options, 'scope')) return;
        context.report({ node: options, messageId: 'optimisticMutationWithoutScope' });
      },
    };
  },
};
