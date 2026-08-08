/**
 * Shared vocabulary for the three purity rules.
 *
 * A pure function returns the same output for the same input and touches
 * nothing outside its arguments and its return value. The lists below are what
 * the rules treat as evidence that a function is not pure, and they are
 * deliberately a list rather than an analysis, because an analysis that is
 * almost right produces false positives, and a false positive in a lint rule
 * costs more than the rule saves.
 *
 * See docs/standards/02-purity-and-core-files.md.
 */

const PURE_FILE_PATTERN = /\.(core|utils)\.tsx?$/;
const TEST_FILE_PATTERN = /\.(test|spec|test-utils)\.[jt]sx?$/;
const CONTROLLER_FILE_PATTERN = /\.controller\.ts$/;

/** Globals a pure function may not read. */
export const IMPURE_GLOBALS = new Set([
  'console',
  'document',
  'fetch',
  'localStorage',
  'navigator',
  'process',
  'sessionStorage',
  'window',
  'globalThis',
  'crypto',
  'performance',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'alert',
]);

/** Member calls a pure function may not make, written as `object.property`. */
export const IMPURE_MEMBER_CALLS = new Set(['Date.now', 'Math.random']);

export function isPureFile(filename) {
  return PURE_FILE_PATTERN.test(filename);
}

export function isTestFile(filename) {
  return TEST_FILE_PATTERN.test(filename);
}

export function isControllerFile(filename) {
  return CONTROLLER_FILE_PATTERN.test(filename);
}

/** `new Date()` with no argument reads the clock. `new Date(iso)` does not. */
export function isClockReadingDateConstruction(node) {
  return (
    node.type === 'NewExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'Date' &&
    node.arguments.length === 0
  );
}

export function readMemberCallName(node) {
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'MemberExpression' ||
    node.callee.object.type !== 'Identifier' ||
    node.callee.property.type !== 'Identifier'
  ) {
    return null;
  }
  return `${node.callee.object.name}.${node.callee.property.name}`;
}

const BRANCH_NODE_TYPES = new Set(['IfStatement', 'ConditionalExpression', 'SwitchStatement']);

const FUNCTION_NODE_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

export function isBranchNode(node) {
  if (BRANCH_NODE_TYPES.has(node.type)) {
    return true;
  }
  return node.type === 'LogicalExpression' && (node.operator === '&&' || node.operator === '||');
}

export function isFunctionNode(node) {
  return FUNCTION_NODE_TYPES.has(node.type);
}

/** A hook is impure by construction, because it reads React's render state. */
export function isReactHookName(name) {
  return typeof name === 'string' && /^use[A-Z]/.test(name);
}

/** A component returns a tree rather than a value, so it is not a pure helper. */
export function isComponentName(name) {
  return typeof name === 'string' && /^[A-Z]/.test(name);
}

export function readFunctionName(node) {
  if (node.id?.name !== undefined) {
    return node.id.name;
  }
  const parent = node.parent;
  if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
    return parent.id.name;
  }
  if (parent?.type === 'Property' && parent.key.type === 'Identifier') {
    return parent.key.name;
  }
  return null;
}
