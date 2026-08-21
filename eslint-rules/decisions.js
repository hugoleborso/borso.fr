const NULLISH_COMPARISON_OPERATORS = new Set(['===', '!==', '==', '!=']);
const TYPE_COMPARISON_OPERATORS = new Set(['===', '!==']);
const COLLECTION_SIZE_PROPERTY_NAMES = new Set(['length', 'size']);
const EMPTINESS_COMPARISON_OPERATORS = new Set(['===', '!==', '>', '<', '>=', '<=']);
const EMPTY_STRING_COMPARISON_OPERATORS = new Set(['===', '!==', '==', '!=']);

const CLAIM_PREFIXES = ['is', 'has', 'can', 'should', 'show', 'did', 'are', 'was'];
const CLAIM_NAME_PATTERN = new RegExp(`^(?:${CLAIM_PREFIXES.join('|')})[A-Z0-9_]`);
const MEANINGLESS_WRAPPER_TYPES = new Set([
  'ChainExpression',
  'TSNonNullExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSInstantiationExpression',
]);

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

function isEmptyStringLiteral(node) {
  const inner = unwrap(node);
  return inner.type === 'Literal' && inner.value === '';
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

function isEmptyStringComparison(node) {
  return (
    EMPTY_STRING_COMPARISON_OPERATORS.has(node.operator) &&
    (isEmptyStringLiteral(node.left) || isEmptyStringLiteral(node.right))
  );
}

function isShapeBinaryTest(node) {
  if (node.operator === 'in' || node.operator === 'instanceof') {
    return true;
  }
  return (
    isNullishComparison(node) ||
    isTypeofComparison(node) ||
    isEmptinessComparison(node) ||
    isEmptyStringComparison(node)
  );
}

// @FollowsBlueprint lint-rule-predicate
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

function readsClaimShapedProperty(node) {
  const inner = unwrap(node);
  return (
    inner.type === 'MemberExpression' &&
    !inner.computed &&
    inner.property.type === 'Identifier' &&
    CLAIM_NAME_PATTERN.test(inner.property.name)
  );
}

function isSettledTest(node, doesBarePresenceCount) {
  const inner = unwrap(node);
  if (inner.type === 'UnaryExpression' && inner.operator === '!') {
    return isSettledTest(inner.argument, doesBarePresenceCount);
  }
  if (inner.type === 'LogicalExpression' && inner.operator !== '??') {
    return (
      isSettledTest(inner.left, doesBarePresenceCount) &&
      isSettledTest(inner.right, doesBarePresenceCount)
    );
  }
  if (isShapeTest(inner)) {
    return true;
  }
  if (inner.type === 'Identifier' || inner.type === 'ThisExpression') {
    return true;
  }
  if (!isValueReference(inner)) {
    return false;
  }
  return doesBarePresenceCount || readsClaimShapedProperty(inner);
}

export function isNamedResultTest(node) {
  return isSettledTest(node, false);
}

export function isNamedResultOrPresenceTest(node) {
  return isSettledTest(node, true);
}

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

function areSameCallWithPlainArguments(left, right, sourceCode) {
  const leftCallee = readCalleeText(left, sourceCode);
  return leftCallee !== null && leftCallee === readCalleeText(right, sourceCode);
}

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

function readGuardStatement(ifStatement) {
  const consequent = unwrapBlock(ifStatement.consequent);
  if (ifStatement.alternate !== null || consequent.length !== 1) {
    return null;
  }
  return consequent[0];
}

export function isGuardClause(ifStatement) {
  const only = readGuardStatement(ifStatement);
  return only !== null && (only.type === 'ReturnStatement' || only.type === 'ThrowStatement');
}

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
