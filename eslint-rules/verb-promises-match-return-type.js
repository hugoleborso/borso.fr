import { readFunctionName } from './impurity.js';

/**
 * The verb table in `01. Naming` gives each verb a return value it promises,
 * and until now nothing checked that the promise was kept. A `find…` that hands
 * back an array reads as "the thing or `null`" at every call site, and the
 * caller writes `if (found)` against a value that is truthy when empty.
 *
 * Only the annotation is read, so no type information is needed and the rule
 * reaches `scripts/` and `eslint-rules/` as well as the applications. A
 * function with no annotation is not checked: the promise is unfalsifiable
 * there, and asking for one is a different rule's job.
 *
 * Three of the eight verbs carry a promise a syntax tree can settle:
 *
 * - `list…` returns an array, so an annotation that is not one is a violation.
 * - `find…` returns one thing, so an array annotation is a violation. The other
 *   half of its promise, `null` when absent, is deliberately not checked: a
 *   `find…` over a total function legitimately never returns `null`, and
 *   demanding one would push authors toward a nullable type they then have to
 *   narrow away.
 * - `is…`, `has…` and `can…` return a boolean, or a type predicate, which is
 *   the boolean plus what it proves.
 *
 * The remaining five promise a shape rather than a form — `build…` a new value,
 * `project…` a view, `select…` what a rule chose — and no annotation can
 * distinguish those from each other. They stay with the reviewer.
 *
 * See docs/standards/01-naming.md.
 */
const ARRAY_MESSAGE =
  '`{{name}}` starts with `{{verb}}`, which promises {{promise}}, and the return type is {{actual}}. ' +
  'Rename it or change what it returns. See docs/standards/01-naming.md.';

const LIST_PREFIX = /^list(?=[A-Z])/;
const FIND_PREFIX = /^find(?=[A-Z])/;
const BOOLEAN_PREFIX = /^(is|has|can)(?=[A-Z])/;

const ARRAY_TYPE_NODES = new Set(['TSArrayType', 'TSTupleType']);
const READONLY_OPERATOR = 'readonly';
const ARRAY_TYPE_NAMES = new Set(['Array', 'ReadonlyArray']);

function isArrayType(node) {
  if (ARRAY_TYPE_NODES.has(node.type)) return true;
  if (node.type === 'TSTypeOperator' && node.operator === READONLY_OPERATOR) {
    return node.typeAnnotation !== undefined && isArrayType(node.typeAnnotation);
  }
  if (node.type === 'TSTypeReference' && node.typeName.type === 'Identifier') {
    return ARRAY_TYPE_NAMES.has(node.typeName.name);
  }
  return false;
}

function isBooleanType(node) {
  if (node.type === 'TSBooleanKeyword' || node.type === 'TSTypePredicate') return true;
  return node.type === 'TSUnionType' && node.types.every(isBooleanType);
}

/**
 * A promise is only checkable on the value the caller receives, so an async
 * function is read through its `Promise<…>`. A bare `Promise` carries no inner
 * type, and is read as itself: TypeScript rejects it anyway, so the report this
 * produces lands on code that does not compile either way.
 */
function readAwaitedType(node) {
  if (node.type !== 'TSTypeReference') return node;
  if (node.typeName.type !== 'Identifier' || node.typeName.name !== 'Promise') return node;
  return node.typeArguments?.params[0] ?? node;
}

const CHECKS = [
  {
    prefix: LIST_PREFIX,
    promise: 'an array',
    isKept: isArrayType,
  },
  {
    prefix: FIND_PREFIX,
    promise: 'one thing, or `null` when it is absent',
    isKept: (node) => !isArrayType(node),
  },
  {
    prefix: BOOLEAN_PREFIX,
    promise: 'a boolean',
    isKept: isBooleanType,
  },
];

function describeType(node, sourceCode) {
  return `\`${sourceCode.getText(node)}\``;
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: "Require a function's return type to keep the promise its verb makes." },
    schema: [],
    messages: { brokenPromise: ARRAY_MESSAGE },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    function checkFunction(node) {
      const name = readFunctionName(node);
      const annotation = node.returnType?.typeAnnotation;
      if (name === null || annotation === undefined) return;
      const declared = readAwaitedType(annotation);
      for (const check of CHECKS) {
        const match = check.prefix.exec(name);
        if (match === null || check.isKept(declared)) continue;
        context.report({
          node: annotation,
          messageId: 'brokenPromise',
          data: {
            name,
            verb: `${match[1] ?? match[0]}…`,
            promise: check.promise,
            actual: describeType(declared, sourceCode),
          },
        });
      }
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
      TSDeclareFunction: checkFunction,
    };
  },
};
