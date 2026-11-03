import { readFileBaseName } from './class-strings.js';

const BUTTON_MESSAGE =
  'A raw <button> draws a button the design system does not know: no icon, no tap target, ' +
  'no variant. Use Button, IconButton, RoundAction, Chip, ListRow, SectionTabs or Menu. ' +
  'See docs/standards/05-frontend-architecture.md.';

const DIALOG_MESSAGE =
  'A raw <dialog> repeats what Sheet owns: the grabber, the title, the close button, one ' +
  'scroll body, the footer and where focus lands. Render the content inside Sheet. ' +
  'See docs/standards/05-frontend-architecture.md.';

const HIDDEN_CLICK_TARGET_MESSAGE =
  'An element hidden from assistive technology that takes a pointer event is a hand-written ' +
  'outside-tap catcher: no keyboard or screen reader reaches it, and it redoes what the ' +
  "browser's modal dialog backdrop and Escape already do. Open the content in Sheet or Menu. " +
  'See docs/dantotsus/the-menu-written-three-times.md.';

const POINTER_HANDLERS = new Set([
  'onClick',
  'onPointerDown',
  'onPointerUp',
  'onMouseDown',
  'onMouseUp',
  'onTouchStart',
  'onTouchEnd',
]);

const DEFAULT_BUTTON_FILES = [
  'Button.tsx',
  'IconButton.tsx',
  'RoundAction.tsx',
  'Chip.tsx',
  'ListRow.tsx',
  'SectionTabs.tsx',
  'Menu.tsx',
];
const DEFAULT_DIALOG_FILES = ['Sheet.tsx'];
const BUTTON_ELEMENT = 'button';
const DIALOG_ELEMENT = 'dialog';

function readAttributeName(attribute) {
  return attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier'
    ? attribute.name.name
    : null;
}

function isHiddenFromAssistiveTechnology(attribute) {
  if (readAttributeName(attribute) !== 'aria-hidden') return false;
  const { value } = attribute;
  if (value === null) return true;
  if (value.type === 'Literal') return value.value === 'true';
  return value.expression.type === 'Literal' && value.expression.value === true;
}

function isHiddenClickTarget(openingElement) {
  const { attributes } = openingElement;
  return (
    attributes.some(isHiddenFromAssistiveTechnology) &&
    attributes.some((attribute) => POINTER_HANDLERS.has(readAttributeName(attribute)))
  );
}

function readElementName(openingElement) {
  return openingElement.name.type === 'JSXIdentifier' ? openingElement.name.name : null;
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid raw <button> and <dialog> elements outside the components that own them, and click targets hidden from assistive technology.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          buttonFiles: { type: 'array', items: { type: 'string' } },
          dialogFiles: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      rawButton: BUTTON_MESSAGE,
      rawDialog: DIALOG_MESSAGE,
      hiddenClickTarget: HIDDEN_CLICK_TARGET_MESSAGE,
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const fileName = readFileBaseName(context.filename);
    const isButtonOwner = (options.buttonFiles ?? DEFAULT_BUTTON_FILES).includes(fileName);
    const isDialogOwner = (options.dialogFiles ?? DEFAULT_DIALOG_FILES).includes(fileName);
    return {
      JSXOpeningElement(node) {
        const name = readElementName(node);
        if (name === BUTTON_ELEMENT && !isButtonOwner) {
          context.report({ node, messageId: 'rawButton' });
        }
        if (name === DIALOG_ELEMENT && !isDialogOwner) {
          context.report({ node, messageId: 'rawDialog' });
        }
        if (isHiddenClickTarget(node)) {
          context.report({ node, messageId: 'hiddenClickTarget' });
        }
      },
    };
  },
};
