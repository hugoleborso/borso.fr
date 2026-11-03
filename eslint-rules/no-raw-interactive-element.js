import { readFileBaseName } from './class-strings.js';

const BUTTON_MESSAGE =
  'A raw <button> draws a button the design system does not know: no icon, no tap target, ' +
  'no variant. Use Button, IconButton, RoundAction, Chip, ListRow, SectionTabs or Menu. ' +
  'See docs/standards/05-frontend-architecture.md.';

const DIALOG_MESSAGE =
  'A raw <dialog> repeats what Sheet owns: the grabber, the title, the close button, one ' +
  'scroll body, the footer and where focus lands. Render the content inside Sheet. ' +
  'See docs/standards/05-frontend-architecture.md.';

const LIBRARY_OVERLAY_MESSAGE =
  'A React Aria overlay outside Sheet or Menu repeats what they own: the scrim, the tap ' +
  'outside, the grabber, the title, the close button and where focus lands. Render the ' +
  'content inside Sheet or Menu. See docs/standards/05-frontend-architecture.md.';

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
  'Menu.tsx',
];
const DEFAULT_DIALOG_FILES = [];
const DEFAULT_OVERLAY_FILES = ['Sheet.tsx', 'Menu.tsx'];
const OVERLAY_LIBRARY = 'react-aria-components';
const LIBRARY_OVERLAYS = new Set([
  'Dialog',
  'Modal',
  'ModalOverlay',
  'Popover',
  'Sheet',
  'SheetOverlay',
  'SheetContent',
]);
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

function readImportedName(specifier) {
  return specifier.type === 'ImportSpecifier' && specifier.imported.type === 'Identifier'
    ? specifier.imported.name
    : null;
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
        'Forbid raw <button> and <dialog> elements and React Aria overlays outside the components that own them, and click targets hidden from assistive technology.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          buttonFiles: { type: 'array', items: { type: 'string' } },
          dialogFiles: { type: 'array', items: { type: 'string' } },
          overlayFiles: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      rawButton: BUTTON_MESSAGE,
      rawDialog: DIALOG_MESSAGE,
      libraryOverlay: LIBRARY_OVERLAY_MESSAGE,
      hiddenClickTarget: HIDDEN_CLICK_TARGET_MESSAGE,
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const fileName = readFileBaseName(context.filename);
    const isButtonOwner = (options.buttonFiles ?? DEFAULT_BUTTON_FILES).includes(fileName);
    const isDialogOwner = (options.dialogFiles ?? DEFAULT_DIALOG_FILES).includes(fileName);
    const isOverlayOwner = (options.overlayFiles ?? DEFAULT_OVERLAY_FILES).includes(fileName);
    return {
      ImportDeclaration(node) {
        if (isOverlayOwner || node.source.value !== OVERLAY_LIBRARY) return;
        for (const specifier of node.specifiers) {
          if (LIBRARY_OVERLAYS.has(readImportedName(specifier))) {
            context.report({ node: specifier, messageId: 'libraryOverlay' });
          }
        }
      },
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
