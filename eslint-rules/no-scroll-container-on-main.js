const MESSAGE =
  'A <main> that scrolls is a second scroller inside a window that can still scroll. ' +
  'On an installed iPhone app, iOS scrolls the window to show a focused field and does ' +
  'not always scroll it back, which lifts the whole shell and leaves an empty band under ' +
  'it. Let the document scroll: give the shell min-h-dvh and remove the overflow class. ' +
  'See docs/dantotsus/the-shell-that-scrolled-inside-a-window-that-still-could.md.';

const CLASS_NAME_ATTRIBUTE = 'className';
const MAIN_ELEMENT = 'main';
const SCROLLING_OVERFLOW = /^overflow(?:-y)?-(?:auto|scroll)$/u;

function readElementName(openingElement) {
  const name = openingElement.name;
  return name.type === 'JSXIdentifier' ? name.name : null;
}

function readClassTokens(openingElement) {
  const attribute = openingElement.attributes.find(
    (candidate) =>
      candidate.type === 'JSXAttribute' &&
      candidate.name.type === 'JSXIdentifier' &&
      candidate.name.name === CLASS_NAME_ATTRIBUTE,
  );
  if (attribute === undefined || attribute.value === null) return [];
  if (attribute.value.type !== 'Literal' || typeof attribute.value.value !== 'string') return [];
  return attribute.value.value.split(/\s+/u).map(withoutVariantPrefix).filter(Boolean);
}

function withoutVariantPrefix(token) {
  return token.slice(token.lastIndexOf(':') + 1);
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid a <main> element that is its own scroll container.',
    },
    schema: [],
    messages: { scrollingMain: MESSAGE },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (readElementName(node) !== MAIN_ELEMENT) return;
        if (!readClassTokens(node).some((token) => SCROLLING_OVERFLOW.test(token))) return;
        context.report({ node, messageId: 'scrollingMain' });
      },
    };
  },
};
