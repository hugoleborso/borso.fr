import {
  IMPURE_GLOBALS,
  IMPURE_MEMBER_CALLS,
  isBranchNode,
  isClockReadingDateConstruction,
  isComponentName,
  isFunctionNode,
  isPureFile,
  isReactHookName,
  isTestFile,
  readFunctionName,
  readMemberCallName,
} from './impurity.js';

/**
 * The other half of `conditions-live-in-pure-functions`. That rule says a
 * branch belongs in a pure function, and the present rule says a pure function
 * belongs in a `.core.ts` or `.utils.ts` file, where the coverage gate and the
 * mutation gate can find it.
 *
 * A function is reported when it carries at least one branch and shows no sign
 * of impurity. The signs are a deliberate list rather than an analysis, since
 * an analysis that is almost right produces false positives.
 *
 * React components and hooks are exempt, because a component returns a tree
 * and a hook reads render state, so neither is a pure helper even when its
 * body happens to look like one.
 *
 * See docs/standards/02-purity-and-core-files.md.
 */
const MESSAGE =
  'The function `{{name}}` branches and touches nothing outside its arguments, so it is a pure ' +
  'function and belongs in a `.core.ts` or `.utils.ts` file with a sibling test. Pure files ' +
  'carry the coverage and mutation gates, and this file does not. ' +
  'See docs/standards/02-purity-and-core-files.md.';

const IMPURITY_MARKER_TYPES = new Set([
  'AwaitExpression',
  'YieldExpression',
  'JSXElement',
  'JSXFragment',
]);

function walk(node, visit) {
  if (node === null || typeof node.type !== 'string') {
    return;
  }
  if (visit(node) === false) {
    return;
  }
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && typeof item?.type === 'string') {
          walk(item, visit);
        }
      }
    } else if (value !== null && typeof value?.type === 'string') {
      walk(value, visit);
    }
  }
}

function inspectFunctionBody(functionNode) {
  let hasBranch = false;
  let hasImpurityMarker = false;

  walk(functionNode.body, (node) => {
    if (isBranchNode(node)) {
      hasBranch = true;
    }
    if (IMPURITY_MARKER_TYPES.has(node.type)) {
      hasImpurityMarker = true;
    }
    if (isClockReadingDateConstruction(node)) {
      hasImpurityMarker = true;
    }
    if (node.type === 'Identifier' && IMPURE_GLOBALS.has(node.name)) {
      hasImpurityMarker = true;
    }
    const memberCallName = readMemberCallName(node);
    if (memberCallName !== null && IMPURE_MEMBER_CALLS.has(memberCallName)) {
      hasImpurityMarker = true;
    }
    if (node.type === 'CallExpression' && isCallToHook(node)) {
      hasImpurityMarker = true;
    }
    return true;
  });

  return { hasBranch, hasImpurityMarker };
}

function isCallToHook(callExpression) {
  return callExpression.callee.type === 'Identifier' && isReactHookName(callExpression.callee.name);
}

/** A nested function's purity is judged by the function that contains it. */
function hasEnclosingFunction(node) {
  let current = node.parent;
  while (current !== undefined && current !== null) {
    if (isFunctionNode(current)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require pure functions to live in a `.core.ts` or `.utils.ts` file.' },
    schema: [],
    messages: { moveToPureFile: MESSAGE },
  },
  create(context) {
    const { filename } = context;
    if (isPureFile(filename) || isTestFile(filename)) {
      return {};
    }

    function check(node) {
      if (hasEnclosingFunction(node)) {
        return;
      }
      const name = readFunctionName(node);
      if (name === null || isReactHookName(name) || isComponentName(name)) {
        return;
      }
      const { hasBranch, hasImpurityMarker } = inspectFunctionBody(node);
      if (hasBranch && !hasImpurityMarker) {
        context.report({ node, messageId: 'moveToPureFile', data: { name } });
      }
    }

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
};
