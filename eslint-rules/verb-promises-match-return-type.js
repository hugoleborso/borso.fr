import { readFunctionName } from './impurity.js';

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
