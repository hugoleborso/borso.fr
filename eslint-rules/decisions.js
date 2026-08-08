/**
 * Shared vocabulary for the two rules that ask where a decision lives:
 * `conditions-live-in-pure-functions` and `pure-functions-live-in-core-files`.
 *
 * A *decision* compares domain values, chooses between different behaviours,
 * or computes a domain outcome. A syntactic branch that does none of those is
 * shape handling or presentation, and reporting it makes the code worse rather
 * than better, e.g. lifting `row.chart === null ? null : JSON.parse(row.chart)`
 * out of a repository buys a test that asserts `JSON.parse` was called.
 *
 * Both rules answer the same question, so they answer it with the same code.
 * Where a case is genuinely ambiguous the answer is "not a decision", because
 * a false positive teaches people to ignore the rule, while a missed
 * extraction is caught in review.
 *
 * See docs/standards/02-purity-and-core-files.md.
 */

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
export function unwrap(node) {
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
export function isValueReference(node) {
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
export function isShapeTest(node) {
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
export function isPlainValue(node) {
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

/** Two branches a reader could swap without changing what was decided. */
export function areInterchangeable(left, right, sourceCode) {
  if (isPlainValue(left) && isPlainValue(right)) {
    return true;
  }
  return areSameCallWithPlainArguments(left, right, sourceCode);
}

export function unwrapBlock(statement) {
  if (statement === null) {
    return [];
  }
  return statement.type === 'BlockStatement' ? statement.body : [statement];
}

/** The single statement of an `if` with no `else`, or `null`. */
function readGuardStatement(ifStatement) {
  const consequent = unwrapBlock(ifStatement.consequent);
  if (ifStatement.alternate !== null || consequent.length !== 1) {
    return null;
  }
  return consequent[0];
}

/** An `if` with no `else` that leaves the function immediately. */
export function isGuardClause(ifStatement) {
  const only = readGuardStatement(ifStatement);
  return only !== null && (only.type === 'ReturnStatement' || only.type === 'ThrowStatement');
}

/**
 * A guard that refuses rather than answers, meaning it throws, returns
 * nothing, or returns `null` or `undefined`.
 *
 * The distinction matters only to `pure-functions-live-in-core-files`, which
 * still has to report a decision written as a chain of guards, e.g.
 * `if (laps > required) { return 'finisher'; } return 'running';`. Refusing is
 * not answering, so a throwing guard is a validation and an empty return is an
 * absent result.
 */
export function isRefusalGuard(ifStatement) {
  const only = readGuardStatement(ifStatement);
  if (only === null) {
    return false;
  }
  if (only.type === 'ThrowStatement') {
    return true;
  }
  return (
    only.type === 'ReturnStatement' && (only.argument === null || isNullishLiteral(only.argument))
  );
}

/** A `switch` whose every case is `case x: return <plain value>`. */
export function isLookupTableSwitch(switchStatement) {
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
