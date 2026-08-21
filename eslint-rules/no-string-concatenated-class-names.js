import { isSiteFile } from './site-paths.js';

const ASSEMBLED_MESSAGE =
  'A class name assembled at runtime is invisible to Tailwind, which builds the stylesheet by ' +
  'scanning the source for class names written literally, so the utility is missing from the ' +
  'built CSS and the element renders unstyled. Compose whole class names with `clsx`, and ' +
  'write a set of variants as one `cva` table. See docs/standards/08-styling.md.';

const STATIC_TEMPLATE_MESSAGE =
  'A template literal with nothing to interpolate is a plain string, so write it as one. Left ' +
  'as a template it invites the interpolation that Tailwind cannot see, because the scanner ' +
  'only finds class names written literally. See docs/standards/08-styling.md.';

const CLASS_NAME_ATTRIBUTE = 'className';

const CONCATENATION_OPERATOR = '+';

const TRANSPARENT_EXPRESSION_TYPES = new Set(['ConditionalExpression', 'LogicalExpression']);

function readBranches(node) {
  if (node.type === 'ConditionalExpression') {
    return [node.test, node.consequent, node.alternate];
  }
  return [node.left, node.right];
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid a class name built by interpolation or concatenation.' },
    schema: [],
    messages: {
      assembledClassName: ASSEMBLED_MESSAGE,
      staticTemplateClassName: STATIC_TEMPLATE_MESSAGE,
    },
  },
  create(context) {
    if (!isSiteFile(context.filename)) {
      return {};
    }

    function reportAssembledExpressions(node) {
      if (TRANSPARENT_EXPRESSION_TYPES.has(node.type)) {
        for (const branch of readBranches(node)) {
          reportAssembledExpressions(branch);
        }
        return;
      }
      if (node.type === 'TemplateLiteral') {
        const messageId =
          node.expressions.length > 0 ? 'assembledClassName' : 'staticTemplateClassName';
        context.report({ node, messageId });
        return;
      }
      if (node.type === 'BinaryExpression' && node.operator === CONCATENATION_OPERATOR) {
        context.report({ node, messageId: 'assembledClassName' });
      }
    }

    return {
      JSXAttribute(node) {
        if (
          node.name.type !== 'JSXIdentifier' ||
          node.name.name !== CLASS_NAME_ATTRIBUTE ||
          node.value === null ||
          node.value.type !== 'JSXExpressionContainer'
        ) {
          return;
        }
        reportAssembledExpressions(node.value.expression);
      },
    };
  },
};
