import { isTestFile } from './impurity.js';
import { isSiteFile, toPosixPath } from './site-paths.js';

/**
 * Every string a user reads comes from a catalogue, because that is what makes
 * a missing translation visible. A key with no French translation renders the
 * key, which someone notices, and an inline English string renders fine until
 * a French speaker reads the page.
 *
 * This rule is the easiest one in the plugin to make noisy, since most of the
 * text between two JSX tags is layout whitespace. It is therefore built around
 * one question, which is "does this fragment contain a word", and a fragment
 * is a word when it holds two or more letters.
 *
 * What this deliberately allows, and why:
 *
 * - Whitespace, which is every newline and indent between two elements.
 * - Punctuation and symbols on their own, e.g. `·`, `—`, `:`, `%`, `(`, `)`,
 *   which are visual separators rather than text to translate.
 * - Digits on their own, e.g. `2024` and `12:00`, since a number is the same
 *   in both catalogues. A formatted number still belongs in an `Intl`
 *   formatter, and a reviewer catches that better than a rule.
 * - A single letter, e.g. `×` written as `x`, or a unit such as `°`.
 * - Anything inside a JSX expression, e.g. `{t('catalog.title')}`, `{count}`,
 *   and a template literal, because the rule cannot read what a call returns
 *   and a template literal with a French half is a different defect.
 * - Every attribute, including `alt`, `title`, and `placeholder`. Those are
 *   user visible and they do belong in the catalogue, and a rule that reads
 *   attributes has to know which of `className`, `id`, `type`, `role`, and a
 *   hundred others are text, so it would misfire far more than it caught.
 *   A reviewer checks attributes.
 * - Test files, where literal text is the assertion.
 *
 * See docs/standards/09-i18n.md.
 */
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
