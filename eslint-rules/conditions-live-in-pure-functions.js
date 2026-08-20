import {
  areInterchangeable,
  isGuardClause,
  isLookupTableSwitch,
  isNamedResultOrPresenceTest,
  isNamedResultTest,
  isPlainValue,
} from './decisions.js';
import { isPureFile, isTestPath } from './impurity.js';

const MESSAGE =
  'Move this decision into a pure function in a `.core.ts` or `.utils.ts` file, and call it ' +
  'from here. A decision in impure code cannot be tested without standing up whatever the ' +
  'surrounding code touches. A presence test, a guard clause, a test that reads an already ' +
  'named result such as `isConcert` or `props.hasOverride`, and a choice between two plain ' +
  'values are all exempt. See docs/standards/02-purity-and-core-files.md.';

function isInsideJsx(node) {
  let current = node.parent;
  while (current !== undefined && current !== null) {
    if (current.type === 'JSXExpressionContainer') {
      return true;
    }
    if (current.type === 'JSXElement' || current.type === 'JSXFragment') {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function isRenderedByJsx(node) {
  const { parent } = node;
  if (parent.type === 'LogicalExpression' || parent.type === 'UnaryExpression') {
    return false;
  }
  if (
    (parent.type === 'ConditionalExpression' || parent.type === 'IfStatement') &&
    parent.test === node
  ) {
    return false;
  }
  return isInsideJsx(node);
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require every business decision to live in a pure `.core.ts` or `.utils.ts` file.',
    },
    schema: [],
    messages: { moveToPureFunction: MESSAGE },
  },
  create(context) {
    const { filename, sourceCode } = context;
    if (isPureFile(filename) || isTestPath(filename)) {
      return {};
    }

    function report(node) {
      context.report({ node, messageId: 'moveToPureFunction' });
    }

    return {
      IfStatement(node) {
        if (isGuardClause(node) || isNamedResultOrPresenceTest(node.test)) {
          return;
        }
        report(node);
      },
      ConditionalExpression(node) {
        if (
          isNamedResultOrPresenceTest(node.test) ||
          areInterchangeable(node.consequent, node.alternate, sourceCode)
        ) {
          return;
        }
        report(node);
      },
      SwitchStatement(node) {
        if (isLookupTableSwitch(node)) {
          return;
        }
        report(node);
      },
      LogicalExpression(node) {
        if (node.operator === '??' || !isRenderedByJsx(node)) {
          return;
        }
        if (isNamedResultTest(node.left) || isPlainValue(node.right)) {
          return;
        }
        report(node);
      },
    };
  },
};
