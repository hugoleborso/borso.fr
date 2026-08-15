/**
 * `parsed`, `result`, `data`, `entries`, `payload` name the step that produced
 * a value rather than the value. They tell a reader where it came from, which
 * the line above already says, and nothing about what it holds, which is what
 * they came to find out.
 *
 * The test the rule mechanises: read the name with the right-hand side covered.
 * `const parsed = …` could introduce a Zod parse, a JSON parse, a date parse or
 * a chord parse and read the same above all four, so it names none of them.
 *
 * Two shapes are deliberately out of scope, matching the standard:
 *
 *   * A `for (const entry of …)` head. CLAUDE.md's *Clean code* section names
 *     `entry` among the acceptable generic locals, and a loop variable's
 *     meaning is one line away by construction.
 *   * A destructuring pattern. `const { data } = useQuery(…)` and
 *     `const { value } = form` take the name their library chose, and renaming
 *     at the binding hides the contract. Rename at the use site if it helps.
 *
 * See docs/standards/01-naming.md.
 */

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
