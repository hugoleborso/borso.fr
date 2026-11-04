import { isSiteFile } from './site-paths.js';

const MESSAGE =
  'A role query with `hidden: true` reaches an element no user can reach, such as an item ' +
  'inside a closed menu, so the test stops describing what a person does and breaks or goes ' +
  'vacuous when the component changes how it hides things. Open the menu, sheet or dialog ' +
  'first, then query it as a user sees it. See docs/standards/10-testing.md.';

const ROLE_QUERY_PATTERN = /^(get|query|find)(All)?ByRole$/;

function readCalleeName(callee) {
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return null;
}

function isHiddenTrueProperty(property) {
  return (
    property.type === 'Property' &&
    property.key.type === 'Identifier' &&
    property.key.name === 'hidden' &&
    property.value.type === 'Literal' &&
    property.value.value === true
  );
}

export function isHiddenRoleQuery(node) {
  const name = readCalleeName(node.callee);
  if (name === null || !ROLE_QUERY_PATTERN.test(name)) {
    return false;
  }
  return node.arguments.some(
    (argument) =>
      argument.type === 'ObjectExpression' && argument.properties.some(isHiddenTrueProperty),
  );
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid role queries that include elements hidden from users.' },
    schema: [],
    messages: { hiddenRoleQuery: MESSAGE },
  },
  create(context) {
    if (!isSiteFile(context.filename)) {
      return {};
    }
    return {
      CallExpression(node) {
        if (isHiddenRoleQuery(node)) {
          context.report({ node, messageId: 'hiddenRoleQuery' });
        }
      },
    };
  },
};
