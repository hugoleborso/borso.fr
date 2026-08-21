const CAMEL_BOUNDARY_PATTERN = /([a-z0-9])([A-Z])/g;
const ACRONYM_BOUNDARY_PATTERN = /([A-Z]+)([A-Z][a-z])/g;
const NON_ALPHANUMERIC_PATTERN = /[^A-Za-z0-9]+/g;

// @FollowsBlueprint lint-rule-predicate
export function readIdentifierSegments(name) {
  return name
    .replaceAll(CAMEL_BOUNDARY_PATTERN, '$1 $2')
    .replaceAll(ACRONYM_BOUNDARY_PATTERN, '$1 $2')
    .replaceAll(NON_ALPHANUMERIC_PATTERN, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter((segment) => segment.length > 0);
}

const FUNCTION_NODE_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

export function readParameterIdentifiers(node) {
  return node.params
    .map((parameter) => {
      if (parameter.type === 'AssignmentPattern') {
        return parameter.left;
      }
      if (parameter.type === 'RestElement') {
        return parameter.argument;
      }
      return parameter;
    })
    .filter((parameter) => parameter.type === 'Identifier');
}

export function isFunctionNodeType(type) {
  return FUNCTION_NODE_TYPES.has(type);
}
