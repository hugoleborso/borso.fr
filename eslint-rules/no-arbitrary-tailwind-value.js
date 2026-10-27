import { buildClassStringVisitors, readFileBaseName } from './class-strings.js';
import { forEachDescendant } from './ast-walk.js';

const VALUE_MESSAGE =
  '`{{token}}` sets a value outside the design tokens. Use a token from ' +
  'site/src/styles/tokens.css (a colour, a text role, a radius or a shadow), so every screen ' +
  'draws from the same scale and a value nobody chose cannot drift in. See docs/standards/08-styling.md.';

const STYLE_MESSAGE =
  'A colour set through `style` bypasses the tokens. Only a member colour may reach the screen ' +
  'this way, and only through Avatar and MemberMark. See docs/standards/08-styling.md.';

const ARBITRARY_UTILITY = /^-?(?:text|bg|rounded(?:-[a-z]+)?|shadow)-\[/u;
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/u;
const STYLE_ATTRIBUTE_NAME = 'style';
const COLOUR_PROPERTIES = new Set([
  'color',
  'background',
  'backgroundColor',
  'borderColor',
  'fill',
  'stroke',
  'outlineColor',
]);
const DEFAULT_STYLE_COLOUR_FILES = ['Avatar.tsx', 'MemberMark.tsx'];

function findOffendingToken(value) {
  for (const token of value.split(/\s+/u).filter(Boolean)) {
    const utility = token.slice(token.lastIndexOf(':') + 1);
    if (ARBITRARY_UTILITY.test(utility)) return token;
  }
  const raw = RAW_COLOUR.exec(value);
  return raw === null ? null : raw[0];
}

function readPropertyName(property) {
  if (property.type !== 'Property' || property.computed) return null;
  if (property.key.type === 'Identifier') return property.key.name;
  return property.key.type === 'Literal' ? String(property.key.value) : null;
}

function reportStyleColours(context, candidate) {
  if (candidate.type !== 'ObjectExpression') return;
  for (const property of candidate.properties) {
    if (COLOUR_PROPERTIES.has(readPropertyName(property) ?? '')) {
      context.report({ node: property, messageId: 'styleColour' });
    }
  }
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid arbitrary Tailwind colour, text, radius and shadow values, raw colours in class strings, and colours set through style outside the member colour atoms.',
    },
    schema: [
      {
        type: 'object',
        properties: { styleColourFiles: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: { arbitraryValue: VALUE_MESSAGE, styleColour: STYLE_MESSAGE },
  },
  create(context) {
    const styleColourFiles = new Set(
      context.options[0]?.styleColourFiles ?? DEFAULT_STYLE_COLOUR_FILES,
    );
    const classVisitors = buildClassStringVisitors(context, (node, value) => {
      const token = findOffendingToken(value);
      if (token !== null) context.report({ node, messageId: 'arbitraryValue', data: { token } });
    });
    const isStyleColourAllowed = styleColourFiles.has(readFileBaseName(context.filename));
    const reportColour = (candidate) => reportStyleColours(context, candidate);
    return {
      ...classVisitors,
      JSXAttribute(node) {
        classVisitors.JSXAttribute?.(node);
        if (isStyleColourAllowed) return;
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== STYLE_ATTRIBUTE_NAME) return;
        if (node.value === null || node.value.type !== 'JSXExpressionContainer') return;
        reportColour(node.value.expression);
        forEachDescendant(node.value.expression, reportColour);
      },
    };
  },
};
