import { isTestFile } from './impurity.js';
import { isSiteFile, toPosixPath } from './site-paths.js';

const MESSAGE =
  'A translation key is a literal. Assembled at runtime it is invisible to the catalogue ' +
  'parity test and to the typed `CustomTypeOptions` declaration, so a missing French string ' +
  'ships silently. Write a lookup from the domain value to literal keys in a `.core.ts` file. ' +
  'See docs/standards/09-i18n.md.';

const TRANSLATE_FUNCTION_NAME = 't';

function isTranslateCallee(callee) {
  if (callee.type === 'Identifier') {
    return callee.name === TRANSLATE_FUNCTION_NAME;
  }
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    callee.property.name === TRANSLATE_FUNCTION_NAME
  );
}

function isAssembledKey(node) {
  if (node.type === 'TemplateLiteral') {
    return node.expressions.length > 0;
  }
  return node.type === 'BinaryExpression' && node.operator === '+';
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid a translation key built at runtime.' },
    schema: [],
    messages: { dynamicTranslationKey: MESSAGE },
  },
  create(context) {
    const filename = toPosixPath(context.filename);
    if (!isSiteFile(filename) || isTestFile(filename)) {
      return {};
    }
    return {
      CallExpression(node) {
        if (!isTranslateCallee(node.callee) || node.arguments.length === 0) {
          return;
        }
        const [key] = node.arguments;
        if (isAssembledKey(key)) {
          context.report({ node: key, messageId: 'dynamicTranslationKey' });
        }
      },
    };
  },
};
