import { buildClassStringVisitors, readFileBaseName, splitClassTokens } from './class-strings.js';

const MESSAGE =
  '`{{token}}` makes a second vertical scroll area inside a screen whose document already ' +
  'scrolls, which is the double scroll the band complained about. Let the list grow and the ' +
  'document scroll; text areas grow with AutoGrowTextarea; a sheet body is the one scroll ' +
  'inside a sheet. See docs/standards/08-styling.md.';

const VERTICAL_SCROLL_UTILITIES = new Set([
  'overflow-auto',
  'overflow-y-auto',
  'overflow-scroll',
  'overflow-y-scroll',
]);
const DEFAULT_SCROLL_FILES = ['Sheet.tsx', 'sheet.variants.ts'];

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid vertical scroll containers outside Sheet and the scene views.' },
    schema: [
      {
        type: 'object',
        properties: { scrollFiles: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: { verticalScroll: MESSAGE },
  },
  create(context) {
    const scrollFiles = context.options[0]?.scrollFiles ?? DEFAULT_SCROLL_FILES;
    if (scrollFiles.includes(readFileBaseName(context.filename))) return {};
    return buildClassStringVisitors(context, (node, value) => {
      const token = splitClassTokens(value).find((candidate) =>
        VERTICAL_SCROLL_UTILITIES.has(candidate),
      );
      if (token !== undefined)
        context.report({ node, messageId: 'verticalScroll', data: { token } });
    });
  },
};
