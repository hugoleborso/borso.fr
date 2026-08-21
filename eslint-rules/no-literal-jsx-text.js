import { isTestFile } from './impurity.js';
import { isSiteFile, toPosixPath } from './site-paths.js';

const MESSAGE =
  'Visible text in a component belongs in the translation catalogues. Add a key to ' +
  "`i18n/en.json` and `i18n/fr.json`, and render `{t('<route>.<element>')}`, so a missing " +
  'French string shows up as the key rather than as English. See docs/standards/09-i18n.md.';

const LETTER_PATTERN = /\p{L}/gu;

const MINIMUM_LETTERS_FOR_A_WORD = 2;

const JSX_CHILD_PARENT_TYPES = new Set(['JSXElement', 'JSXFragment']);

function holdsAWord(text) {
  const letters = text.match(LETTER_PATTERN);
  return letters !== null && letters.length >= MINIMUM_LETTERS_FOR_A_WORD;
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid user visible text written inline in JSX.' },
    schema: [],
    messages: { literalJsxText: MESSAGE },
  },
  create(context) {
    const filename = toPosixPath(context.filename);
    if (!isSiteFile(filename) || isTestFile(filename)) {
      return {};
    }
    return {
      JSXText(node) {
        if (holdsAWord(node.value)) {
          context.report({ node, messageId: 'literalJsxText' });
        }
      },
      Literal(node) {
        if (
          typeof node.value !== 'string' ||
          node.parent.type !== 'JSXExpressionContainer' ||
          !JSX_CHILD_PARENT_TYPES.has(node.parent.parent.type)
        ) {
          return;
        }
        if (holdsAWord(node.value)) {
          context.report({ node, messageId: 'literalJsxText' });
        }
      },
    };
  },
};
