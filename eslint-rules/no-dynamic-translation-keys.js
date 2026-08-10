import { isTestFile } from './impurity.js';
import { isSiteFile, toPosixPath } from './site-paths.js';

/**
 * Two checks stop working the moment a key is assembled at runtime. The parity
 * test compares the key sets of `en.json` and `fr.json` and cannot see a key
 * that does not exist until render, and the `CustomTypeOptions` declaration
 * types the keys from `en.json` and cannot check a string the type checker
 * only knows as `string`.
 *
 * The replacement is a lookup from the domain value to a literal key, written
 * in a `.core.ts` file where it is covered exhaustively, e.g.
 * `const STATUS_KEYS = { draft: 'catalog.status.draft', … } as const`.
 *
 * What this deliberately allows:
 *
 * - A template literal with no substitution, e.g. t(`catalog.title`), which is
 *   a static string that both checks handle. It is only a quoting choice.
 * - A variable or a member expression, e.g. `t(statusKey)` and
 *   `t(STATUS_KEYS[status])`, which is what the lookup above looks like at the
 *   call site. Telling the good lookup from a hand-built string needs to
 *   follow the value, and the rule would then reject the replacement it asks
 *   for.
 * - Interpolation values, e.g. `t('leaderboard.lap-count', { count })`, since
 *   only the first argument is the key.
 * - Test files, where a key is often assembled to drive a table of cases.
 *
 * See docs/standards/09-i18n.md.
 */
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
