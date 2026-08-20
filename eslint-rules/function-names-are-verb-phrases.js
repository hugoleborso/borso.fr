import { readFunctionName } from './impurity.js';

const MESSAGE =
  '`{{name}}` starts with `{{verb}}`, which promises the reader nothing. Name the function ' +
  'after what it returns, e.g. `find…` for the thing or `null`, `list…` for an array, ' +
  '`build…` for a new value, `project…` for a computed view, and `is…` for a boolean. ' +
  'See docs/standards/01-naming.md.';

const BANNED_VERB_PATTERN = /^(handle|process|manage|do)(?=[A-Z])/;

const COMPONENT_NAME_PATTERN = /^[A-Z]/;

const HOOK_NAME_PATTERN = /^use[A-Z]/;

function readDeclaredFunctionName(node) {
  const parent = node.parent;
  if (
    parent !== undefined &&
    (parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') &&
    !parent.computed &&
    parent.key.type === 'Identifier'
  ) {
    return parent.key.name;
  }
  return readFunctionName(node);
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require a function name that says what the function returns.' },
    schema: [],
    messages: { mechanismVerb: MESSAGE },
  },
  create(context) {
    function checkFunction(node) {
      const name = readDeclaredFunctionName(node);
      if (name === null || COMPONENT_NAME_PATTERN.test(name) || HOOK_NAME_PATTERN.test(name)) {
        return;
      }
      const match = BANNED_VERB_PATTERN.exec(name);
      if (match !== null) {
        context.report({ node, messageId: 'mechanismVerb', data: { name, verb: match[1] } });
      }
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
};
