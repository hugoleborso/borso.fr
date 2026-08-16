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
const TESTED_FILE_PATTERN = /\.(core|utils|adapter|schema)\.tsx?$/;
const TEST_FILE_PATTERN = /\.(test|spec|test-utils)\.[jt]sx?$/;
const TEST_HARNESS_FOLDER_PATTERN = /(^|\/)test\//;
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

/**
 * Modules whose exports read or write something outside the process's own
 * memory. A function that touches a binding imported from one of these is
 * impure however local its body looks, e.g. `readMigrations` calls
 * `fs.readdirSync` and `verifyPinAgainstHash` calls `scryptSync`.
 *
 * `node:path` and `node:url` are absent on purpose, because they compute
 * strings from strings.
 */
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

/**
 * Methods that change the receiver rather than returning a new value. Calling
 * one of these on an argument writes outside the function's return value, so
 * the function is not pure.
 */
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

/**
 * A file the coverage gate covers, which is the pure files plus `.adapter.ts`
 * and `.schema.ts`. Neither of those two is pure — an adapter talks to the
 * network and a schema is a value the module builds at import — so both stay
 * out of `isPureFile`, and the purity rules keep meaning what they meant. The
 * two questions are separate: the gates ask "is this file tested to the line",
 * and the purity rules ask "may this file touch the world".
 *
 * The list is the `coverage.include` of each full-stack application's
 * `vitest.config.ts`, and the two have to agree: a suffix gated there and
 * missing here is a file whose missing test only the coverage number notices.
 *
 * See docs/standards/10-testing.md.
 */
export function isGatedFile(filename) {
  return TESTED_FILE_PATTERN.test(filename);
}

export function isTestFile(filename) {
  return TEST_FILE_PATTERN.test(filename);
}

/**
 * A test, or a file in the harness that runs the tests.
 *
 * `apps/<app>/test/` holds `setup-postgres.ts` and `database-utils.ts`, which
 * start the cluster and truncate tables between suites. They are not named
 * `.test.ts`, and the root `eslint.config.js` already counts `test/**` as test
 * code for the Vitest plugin, so the three architecture rules that exempt
 * tests use this wider question rather than the file name alone.
 */
export function isTestPath(filename) {
  return TEST_FILE_PATTERN.test(filename) || TEST_HARNESS_FOLDER_PATTERN.test(filename);
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

const FUNCTION_NODE_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

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
