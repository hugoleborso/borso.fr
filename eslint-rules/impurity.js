const PURE_FILE_PATTERN = /\.(core|utils)\.tsx?$/;
const TESTED_FILE_PATTERN = /\.(core|utils|adapter|schema)\.tsx?$/;
const TEST_FILE_PATTERN = /\.(test|spec|test-utils)\.[jt]sx?$/;
const TEST_HARNESS_FOLDER_PATTERN = /(^|\/)test\//;
const CONTROLLER_FILE_PATTERN = /\.controller\.ts$/;

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

export const IMPURE_MEMBER_CALLS = new Set(['Date.now', 'Math.random']);

export const IMPURE_MODULE_SOURCES = new Set([
  'child_process',
  'crypto',
  'dns',
  'fs',
  'fs/promises',
  'http',
  'https',
  'net',
  'node:child_process',
  'node:crypto',
  'node:dns',
  'node:fs',
  'node:fs/promises',
  'node:http',
  'node:https',
  'node:net',
  'node:os',
  'node:process',
  'node:readline',
  'node:timers',
  'node:timers/promises',
  'node:worker_threads',
  'os',
  'process',
]);

export const MUTATING_METHOD_NAMES = new Set([
  'add',
  'clear',
  'copyWithin',
  'delete',
  'fill',
  'pop',
  'push',
  'reverse',
  'set',
  'shift',
  'sort',
  'splice',
  'unshift',
]);

// @FollowsBlueprint lint-rule-predicate
export function isPureFile(filename) {
  return PURE_FILE_PATTERN.test(filename);
}

export function isGatedFile(filename) {
  return TESTED_FILE_PATTERN.test(filename);
}

export function isTestFile(filename) {
  return TEST_FILE_PATTERN.test(filename);
}

export function isTestPath(filename) {
  return TEST_FILE_PATTERN.test(filename) || TEST_HARNESS_FOLDER_PATTERN.test(filename);
}

export function isControllerFile(filename) {
  return CONTROLLER_FILE_PATTERN.test(filename);
}

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

const FUNCTION_NODE_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

export function isFunctionNode(node) {
  return FUNCTION_NODE_TYPES.has(node.type);
}

export function isReactHookName(name) {
  return typeof name === 'string' && /^use[A-Z]/.test(name);
}

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
