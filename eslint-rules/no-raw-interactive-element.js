import { readFileBaseName } from './class-strings.js';

const BUTTON_MESSAGE =
  'A raw <button> draws a button the design system does not know: no icon, no tap target, ' +
  'no variant. Use Button, IconButton, RoundAction, Chip, ListRow, SectionTabs or Menu. ' +
  'See docs/standards/05-frontend-architecture.md.';

const DIALOG_MESSAGE =
  'A raw <dialog> repeats what Sheet owns: the grabber, the title, the close button, one ' +
  'scroll body, the footer and where focus lands. Render the content inside Sheet. ' +
  'See docs/standards/05-frontend-architecture.md.';

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
        'Forbid raw <button> and <dialog> elements outside the components that own them.',
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
    messages: { rawButton: BUTTON_MESSAGE, rawDialog: DIALOG_MESSAGE },
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
      },
    };
  },
};
