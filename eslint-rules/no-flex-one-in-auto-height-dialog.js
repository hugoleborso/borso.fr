const MESSAGE =
  'flex-1 resolves to flex-basis 0 in a column whose own height comes from its content, ' +
  'and a dialog with no h- class is exactly that: the child takes zero height and the ' +
  'dialog collapses to its header bar. Blink tolerates it, WebKit does not, so it ships ' +
  'looking fine and reaches a phone broken. Use flex-auto, whose basis is the content. ' +
  'See docs/dantotsus/a-dialog-that-only-collapsed-on-a-phone.md.';

const CLASS_NAME_ATTRIBUTE = 'className';
const ZERO_BASIS_CLASS = 'flex-1';
const COLUMN_CLASS = 'flex-col';
const HEIGHT_PREFIX = 'h-';
const AUTO_HEIGHT = 'h-auto';

function readElementName(jsxElement) {
  const name = jsxElement.openingElement.name;
  return name.type === 'JSXIdentifier' ? name.name : null;
}

function readClassTokens(jsxElement) {
  const attribute = jsxElement.openingElement.attributes.find(
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

function declaresItsOwnHeight(classTokens) {
  return classTokens.some((token) => token.startsWith(HEIGHT_PREFIX) && token !== AUTO_HEIGHT);
}

function collectZeroBasisColumnChildren(jsxElement, parentIsColumn, found) {
  for (const child of jsxElement.children) {
    if (child.type !== 'JSXElement') continue;
    const classTokens = readClassTokens(child);
    if (parentIsColumn && classTokens.includes(ZERO_BASIS_CLASS)) found.push(child);
    collectZeroBasisColumnChildren(child, classTokens.includes(COLUMN_CLASS), found);
  }
  return found;
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid a zero-basis flex child in a column inside an auto-height dialog.',
    },
    schema: [],
    messages: { zeroBasisChild: MESSAGE },
  },
  create(context) {
    return {
      JSXElement(node) {
        if (readElementName(node) !== 'dialog') return;
        const classTokens = readClassTokens(node);
        if (declaresItsOwnHeight(classTokens)) return;
        const isColumn = classTokens.includes(COLUMN_CLASS);
        for (const child of collectZeroBasisColumnChildren(node, isColumn, [])) {
          context.report({ node: child, messageId: 'zeroBasisChild' });
        }
      },
    };
  },
};
