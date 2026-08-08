import { isPureFile, isTestFile } from './impurity.js';

/**
 * A *decision* belongs in a pure function, so that it can be tested by calling
 * it with values and asserting on values, with no mock, no fixture database,
 * and no rendered component.
 *
 * The impure code left behind then reads inputs, calls one decision function,
 * and applies the result, which a reviewer can check by eye.
 *
 * ## Where the boundary sits, and why
 *
 * The rule used to report every syntactic branch, which produced roughly nine
 * hundred findings, almost none of which named a decision. A repository that
 * writes `row.chart === null ? null : JSON.parse(row.chart)` is handling the
 * shape of a database row, and extracting that into `decodeChart` would buy a
 * test that asserts `JSON.parse` was called. A rule that makes code worse gets
 * switched off, correctly, so the rule now reports decisions only.
 *
 * A *decision* compares domain values, chooses between different behaviours,
 * or computes a domain outcome. Everything below is shape handling or
 * presentation instead, so it is exempt.
 *
 * 1. A **shape test**, which asks whether a value is present or what kind of
 *    thing it is, rather than what it means. That covers `x === null`,
 *    `x === undefined`, `x == null`, `!x`, `'key' in object`,
 *    `Array.isArray(x)`, `typeof x === 'string'`, `x instanceof ApiError`, and
 *    a conjunction of those, e.g. `'title' in updates && updates.title !==
 *    undefined`, which is one presence test written twice. `?.` and `??` are
 *    never reported at all, for the same reason.
 * 2. A **guard clause**, meaning an `if` with no `else` whose consequent is a
 *    single `return` or a single `throw`. A guard clause is a guard clause
 *    wherever it appears, so this is no longer limited to `*.controller.ts`.
 * 3. A **conditional action**, meaning an `if` with no `else` whose test is a
 *    bare value reference, e.g. `if (rootElement) { mount(); }`. Nothing is
 *    chosen there, the code either acts or it does not.
 * 4. A **choice between two plain values**, e.g. `isActive ? 'bg-accent' :
 *    'bg-transparent'`, `count > 0 ? count : 0`, and the `&&` form
 *    `canSort && 'cursor-pointer'`. Two calls to the same function with plain
 *    arguments count as plain too, e.g. `isBusy ? t('catalog.uploading') :
 *    t('catalog.uploadPrompt')`, because the choice is still between two
 *    constants.
 * 5. A **switch used as a lookup table**, meaning every case body is a single
 *    `return` of a plain value.
 * 6. Everything inside a `.core.ts` or `.utils.ts` file, which is where the
 *    rule wants decisions to be, and everything inside a test file, because a
 *    test's job is to enumerate cases.
 *
 * ## The judgement calls inside that list
 *
 * `instanceof` is not in the standard's written list, and it is exempt here
 * because it asks what kind of value it holds, which is the same question as
 * `typeof` and `Array.isArray`. `error instanceof ApiError ? error.message :
 * fallback` reads an error, it does not decide anything about the domain.
 *
 * Comparing `.length` or `.size` against `0` is exempt, because an empty
 * collection is an absent value written the way JavaScript writes it. Any
 * other comparison against a number is a threshold, so it is reported.
 *
 * `!value` is exempt everywhere, and a bare `value` is exempt only as the test
 * of an `if` with no `else`. Both forms are how absence gets written when the
 * code only wants to skip something, e.g. `if (!renderingContext) return;` and
 * `if (rootElement) { mount(); }`. Once an `else` or a second branch appears, a
 * bare `value` is the flag half of a decision, so `isAdmin ? readAll() :
 * readOwn()` stays reported.
 *
 * A shape test is exempt whatever its branches do, so
 * `dsql === null ? createLocalClient(local) : createDsqlClient(dsql)` is
 * exempt even though the two branches call different functions. Choosing a
 * client because a configuration value is absent is wiring, not a rule about
 * songs or runners.
 *
 * Where a case is genuinely ambiguous the rule exempts it, because a false
 * positive costs more than a missed extraction. The missed extraction is
 * caught in review, and a false positive teaches people to ignore the rule.
 *
 * ## What the sibling rule still catches
 *
 * Widening the guard clause exemption means `if (laps > required) { return
 * 'finisher'; } return 'running';` is no longer reported here. It is still
 * reported by `borso/pure-functions-live-in-core-files`, which sees a whole
 * function that branches and touches nothing outside its arguments, and asks
 * for the function to move to a `.core.ts` file. The two rules overlap on
 * purpose, and the sibling is the one that catches a decision written as a
 * chain of guards.
 *
 * See docs/standards/02-purity-and-core-files.md.
 */
const MESSAGE =
  'Move this decision into a pure function in a `.core.ts` or `.utils.ts` file, and call it ' +
  'from here. A decision in impure code cannot be tested without standing up whatever the ' +
  'surrounding code touches. A presence test, a guard clause, and a choice between two plain ' +
  'values are exempt. See docs/standards/02-purity-and-core-files.md.';

const NULLISH_COMPARISON_OPERATORS = new Set(['===', '!==', '==', '!=']);
const TYPE_COMPARISON_OPERATORS = new Set(['===', '!==']);
const COLLECTION_SIZE_PROPERTY_NAMES = new Set(['length', 'size']);
const EMPTINESS_COMPARISON_OPERATORS = new Set(['===', '!==', '>', '<', '>=', '<=']);
const MEANINGLESS_WRAPPER_TYPES = new Set([
  'ChainExpression',
  'TSNonNullExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSInstantiationExpression',
]);

/** Strips the syntax that carries no decision of its own, e.g. `a?.b` and `x!`. */
function unwrap(node) {
  let current = node;
  while (current !== null && MEANINGLESS_WRAPPER_TYPES.has(current.type)) {
    current = current.expression;
  }
  return current;
}

function isNullishLiteral(node) {
  const inner = unwrap(node);
  if (inner.type === 'Literal') {
    return inner.value === null && inner.regex === undefined;
  }
  return inner.type === 'Identifier' && inner.name === 'undefined';
}

function isZeroLiteral(node) {
  const inner = unwrap(node);
  return inner.type === 'Literal' && inner.value === 0;
}

function isCollectionSizeRead(node) {
  const inner = unwrap(node);
  return (
    inner.type === 'MemberExpression' &&
    !inner.computed &&
    inner.property.type === 'Identifier' &&
    COLLECTION_SIZE_PROPERTY_NAMES.has(inner.property.name)
  );
}

function isTypeofRead(node) {
  const inner = unwrap(node);
  return inner.type === 'UnaryExpression' && inner.operator === 'typeof';
}

/** An identifier or a dotted path, which names a value without computing one. */
function isValueReference(node) {
  const inner = unwrap(node);
  if (inner.type === 'Identifier' || inner.type === 'ThisExpression') {
    return true;
  }
  return inner.type === 'MemberExpression' && isValueReference(inner.object);
}

function isArrayIsArrayCall(node) {
  const inner = unwrap(node);
  return (
    inner.type === 'CallExpression' &&
    inner.callee.type === 'MemberExpression' &&
    !inner.callee.computed &&
    inner.callee.object.type === 'Identifier' &&
    inner.callee.object.name === 'Array' &&
    inner.callee.property.type === 'Identifier' &&
    inner.callee.property.name === 'isArray'
  );
}

function isNullishComparison(node) {
  return (
    NULLISH_COMPARISON_OPERATORS.has(node.operator) &&
    (isNullishLiteral(node.left) || isNullishLiteral(node.right))
  );
}

function isTypeofComparison(node) {
  return (
    TYPE_COMPARISON_OPERATORS.has(node.operator) &&
    (isTypeofRead(node.left) || isTypeofRead(node.right))
  );
}

function isEmptinessComparison(node) {
  if (!EMPTINESS_COMPARISON_OPERATORS.has(node.operator)) {
    return false;
  }
  return (
    (isCollectionSizeRead(node.left) && isZeroLiteral(node.right)) ||
    (isZeroLiteral(node.left) && isCollectionSizeRead(node.right))
  );
}

function isShapeBinaryTest(node) {
  if (node.operator === 'in' || node.operator === 'instanceof') {
    return true;
  }
  return isNullishComparison(node) || isTypeofComparison(node) || isEmptinessComparison(node);
}

/**
 * Asks whether a value is present, or what kind of thing it is, rather than
 * what it means.
 */
function isShapeTest(node) {
  const inner = unwrap(node);
  if (inner.type === 'UnaryExpression' && inner.operator === '!') {
    return isValueReference(inner.argument) || isShapeTest(inner.argument);
  }
  if (inner.type === 'BinaryExpression') {
    return isShapeBinaryTest(inner);
  }
  if (inner.type === 'LogicalExpression') {
    return isShapeTest(inner.left) && isShapeTest(inner.right);
  }
  return isArrayIsArrayCall(inner);
}

/**
 * A value that is read or written down rather than computed, so choosing
 * between two of them decides nothing.
 */
function isPlainValue(node) {
  const inner = unwrap(node);
  if (inner.type === 'Literal') {
    return true;
  }
  if (inner.type === 'TemplateLiteral') {
    return inner.expressions.every(isPlainValue);
  }
  if (inner.type === 'UnaryExpression') {
    return (inner.operator === '-' || inner.operator === '+') && isPlainValue(inner.argument);
  }
  return isValueReference(inner);
}

function readCalleeText(node, sourceCode) {
  const inner = unwrap(node);
  if (inner.type !== 'CallExpression' || inner.optional) {
    return null;
  }
  if (!inner.arguments.every(isPlainValue)) {
    return null;
  }
  return sourceCode.getText(inner.callee);
}

/**
 * `t('catalog.uploading')` against `t('catalog.uploadPrompt')` is still a
 * choice between two constants, so a shared callee makes both sides plain.
 */
function areSameCallWithPlainArguments(left, right, sourceCode) {
  const leftCallee = readCalleeText(left, sourceCode);
  return leftCallee !== null && leftCallee === readCalleeText(right, sourceCode);
}

function unwrapBlock(statement) {
  if (statement === null) {
    return [];
  }
  return statement.type === 'BlockStatement' ? statement.body : [statement];
}

/** An `if` with no `else` that leaves the function immediately. */
function isGuardClause(ifStatement) {
  const consequent = unwrapBlock(ifStatement.consequent);
  if (ifStatement.alternate !== null || consequent.length !== 1) {
    return false;
  }
  const only = consequent[0];
  return only.type === 'ReturnStatement' || only.type === 'ThrowStatement';
}

/** A `switch` whose every case is `case x: return <plain value>`. */
function isLookupTableSwitch(switchStatement) {
  return switchStatement.cases.every((switchCase) => {
    if (switchCase.consequent.length === 0) {
      return true;
    }
    const only = switchCase.consequent.length === 1 ? switchCase.consequent[0] : null;
    if (only === null) {
      return false;
    }
    const [statement] = unwrapBlock(only);
    if (statement === undefined || statement.type !== 'ReturnStatement') {
      return false;
    }
    return statement.argument === null || isPlainValue(statement.argument);
  });
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
    docs: {
      description:
        'Require every business decision to live in a pure `.core.ts` or `.utils.ts` file.',
    },
    schema: [],
    messages: { moveToPureFunction: MESSAGE },
  },
  create(context) {
    const { filename, sourceCode } = context;
    if (isPureFile(filename) || isTestFile(filename)) {
      return {};
    }

    function report(node) {
      context.report({ node, messageId: 'moveToPureFunction' });
    }

    function isInterchangeable(left, right) {
      if (isPlainValue(left) && isPlainValue(right)) {
        return true;
      }
      return areSameCallWithPlainArguments(left, right, sourceCode);
    }

    return {
      IfStatement(node) {
        if (isGuardClause(node) || isShapeTest(node.test)) {
          return;
        }
        if (node.alternate === null && isValueReference(node.test)) {
          return;
        }
        report(node);
      },
      ConditionalExpression(node) {
        if (isShapeTest(node.test) || isInterchangeable(node.consequent, node.alternate)) {
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
        if (node.operator === '??' || !isInsideJsx(node)) {
          return;
        }
        if (isShapeTest(node.left) || isPlainValue(node.right)) {
          return;
        }
        report(node);
      },
    };
  },
};
