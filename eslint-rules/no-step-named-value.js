const STEP_NAMES = new Set([
  'parsed',
  'result',
  'results',
  'res',
  'data',
  'entries',
  'payload',
  'output',
  'obj',
  'arr',
  'val',
  'tmp',
  'temp',
  'item',
  'items',
]);

const MESSAGE =
  "'{{name}}' names the step that produced the value, not the value. Read the name with the " +
  'right-hand side covered: if it could introduce four different things, it names none of them. ' +
  'Say what it holds — `songWrites`, `namedSong`, `rankedRunners`. ' +
  'See docs/standards/01-naming.md.';

function isForLoopHead(node) {
  const parentType = node.parent?.type;
  return parentType === 'ForOfStatement' || parentType === 'ForInStatement';
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Reject a variable named after the step that produced it rather than its value.',
    },
    schema: [],
    messages: { stepNamed: MESSAGE },
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier') return;
        if (!STEP_NAMES.has(node.id.name)) return;
        if (isForLoopHead(node.parent)) return;
        context.report({ node: node.id, messageId: 'stepNamed', data: { name: node.id.name } });
      },
    };
  },
};
