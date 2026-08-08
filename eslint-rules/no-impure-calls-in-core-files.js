import {
  IMPURE_GLOBALS,
  IMPURE_MEMBER_CALLS,
  isClockReadingDateConstruction,
  isPureFile,
  isTestFile,
  readMemberCallName,
} from './impurity.js';

/**
 * A `.core.ts` or `.utils.ts` file holds pure functions only, so nothing in it
 * may read the clock, the random number generator, the environment, the DOM,
 * or the network.
 *
 * Time is the case that comes up most. Take `now: Date` as a parameter, which
 * makes "what happens one millisecond before the cutoff" a one line test and
 * removes the need for `vi.setSystemTime()`.
 *
 * See docs/standards/02-purity-and-core-files.md.
 */
const CLOCK_MESSAGE =
  'A pure file may not read the clock. Take `now: Date` as a parameter, and let the caller ' +
  'pass `new Date()`. See docs/standards/02-purity-and-core-files.md.';

const GLOBAL_MESSAGE =
  'A pure file may not read `{{name}}`. Pass the value in as an argument, and keep the ' +
  'input and output in the impure caller. See docs/standards/02-purity-and-core-files.md.';

function isDeclaredInScopeChain(scope, name) {
  for (let current = scope; current !== null; current = current.upper) {
    if (current.set.has(name)) {
      return true;
    }
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Keep `.core.ts` and `.utils.ts` files free of impure reads.' },
    schema: [],
    messages: { clock: CLOCK_MESSAGE, impureGlobal: GLOBAL_MESSAGE },
  },
  create(context) {
    if (!isPureFile(context.filename) || isTestFile(context.filename)) {
      return {};
    }

    return {
      NewExpression(node) {
        if (isClockReadingDateConstruction(node)) {
          context.report({ node, messageId: 'clock' });
        }
      },
      CallExpression(node) {
        const memberCallName = readMemberCallName(node);
        if (memberCallName === null || !IMPURE_MEMBER_CALLS.has(memberCallName)) {
          return;
        }
        const messageId = memberCallName === 'Date.now' ? 'clock' : 'impureGlobal';
        context.report({ node, messageId, data: { name: memberCallName } });
      },
      Identifier(node) {
        if (!IMPURE_GLOBALS.has(node.name)) {
          return;
        }
        // Only a free reference counts. A parameter named `document`, a local
        // named `window`, and an imported `fetch` helper are all declarations,
        // so the name resolves somewhere up the scope chain and the read is
        // not a read of the global.
        if (isDeclaredInScopeChain(context.sourceCode.getScope(node), node.name)) {
          return;
        }
        const parent = node.parent;
        if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) {
          return;
        }
        if (parent.type === 'Property' && parent.key === node && !parent.computed) {
          return;
        }
        context.report({ node, messageId: 'impureGlobal', data: { name: node.name } });
      },
    };
  },
};
