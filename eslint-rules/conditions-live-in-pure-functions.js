import { isControllerFile, isPureFile, isTestFile } from './impurity.js';

/**
 * Every branch belongs in a pure function, so that it can be tested by calling
 * it with values and asserting on values, with no mock, no fixture database,
 * and no rendered component.
 *
 * The impure code left behind then reads inputs, calls one decision function,
 * and applies the result, which a reviewer can check by eye.
 *
 * What the rule exempts, matching docs/standards/02-purity-and-core-files.md:
 *
 * - Everything inside a `.core.ts` or `.utils.ts` file, which is where the
 *   rule wants branches to be.
 * - Everything inside a test file, because a test's job is to enumerate cases.
 * - A guard clause whose only consequence is `throw`, which narrows a type
 *   rather than choosing between behaviours.
 * - A single `return` guard inside a `*.controller.ts`, which is how an absent
 *   resource becomes a 404.
 * - `??`, and `&&` or `||` used to combine values rather than to choose a
 *   branch. Only a logical expression inside JSX counts, because that is the
 *   conditional render form the rule is aimed at.
 */
const MESSAGE =
  'Move this condition into a pure function in a `.core.ts` or `.utils.ts` file, and call it ' +
  'from here. A branch in impure code cannot be tested without standing up whatever the ' +
  'surrounding code touches. See docs/standards/02-purity-and-core-files.md.';

function unwrapBlock(statement) {
  if (statement === null) {
    return [];
  }
  return statement.type === 'BlockStatement' ? statement.body : [statement];
}

function isThrowOnlyGuard(ifStatement) {
  const consequent = unwrapBlock(ifStatement.consequent);
  return (
    ifStatement.alternate === null &&
    consequent.length === 1 &&
    consequent[0].type === 'ThrowStatement'
  );
}

function isReturnOnlyGuard(ifStatement) {
  const consequent = unwrapBlock(ifStatement.consequent);
  return (
    ifStatement.alternate === null &&
    consequent.length === 1 &&
    consequent[0].type === 'ReturnStatement'
  );
}

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

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require every branch to live in a pure `.core.ts` or `.utils.ts` file.' },
    schema: [],
    messages: { moveToPureFunction: MESSAGE },
  },
  create(context) {
    const { filename } = context;
    if (isPureFile(filename) || isTestFile(filename)) {
      return {};
    }
    const allowsReturnGuard = isControllerFile(filename);

    function report(node) {
      context.report({ node, messageId: 'moveToPureFunction' });
    }

    return {
      IfStatement(node) {
        if (isThrowOnlyGuard(node)) {
          return;
        }
        if (allowsReturnGuard && isReturnOnlyGuard(node)) {
          return;
        }
        report(node);
      },
      ConditionalExpression: report,
      SwitchStatement: report,
      LogicalExpression(node) {
        if (node.operator === '??') {
          return;
        }
        if (isInsideJsx(node)) {
          report(node);
        }
      },
    };
  },
};
