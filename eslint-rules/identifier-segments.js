/**
 * Shared vocabulary for the two dictionary rules on names.
 *
 * Both rules match a word list against an identifier, and both have to match
 * whole words rather than substrings, so that `nomination` does not trip on
 * `nom` and `resource` does not trip on `res`. Splitting the identifier into
 * its segments first is what buys that, and it costs one regular expression.
 *
 * Both rules also read declarations only. A member access such as
 * `context.req`, an imported name such as `sql`, and a destructured binding
 * such as `const { req } = context` are all names somebody else chose, and
 * reporting them would ask the author to rename something they do not own.
 *
 * See docs/standards/01-naming.md.
 */

const CAMEL_BOUNDARY_PATTERN = /([a-z0-9])([A-Z])/g;
const ACRONYM_BOUNDARY_PATTERN = /([A-Z]+)([A-Z][a-z])/g;
const NON_ALPHANUMERIC_PATTERN = /[^A-Za-z0-9]+/g;

// @FollowsBlueprint lint-rule-predicate
/**
 * The lower case words an identifier is made of.
 *
 * `runnerFicheURLBuilder` becomes `runner`, `fiche`, `url`, `builder`, and
 * `MAX_LAP_COUNT` becomes `max`, `lap`, `count`.
 */
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

/**
 * Every parameter name a function introduces, as `Identifier` nodes.
 *
 * A destructured parameter is skipped for the reason above, since the binding
 * names come from the shape being destructured.
 */
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
