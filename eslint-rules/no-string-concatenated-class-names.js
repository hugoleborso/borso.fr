import { isSiteFile } from './site-paths.js';

/**
 * Tailwind builds the stylesheet by scanning the source for class names that
 * appear literally. A class assembled at runtime never appears, so the utility
 * is absent from the built CSS and the element renders unstyled, on preview
 * and in production, while it looked right in the development server where
 * the just in time compiler had already seen the class from somewhere else.
 *
 * That is why `bg-${colour}` and `'px-' + size` are the shapes this rule
 * rejects, and why the fix is never "concatenate more carefully". Conditional
 * composition goes through `clsx`, which combines whole class names the
 * scanner has already found, and a set of variants goes through `cva`, which
 * turns them into one typed table.
 *
 * A template literal with no substitution is reported too, with its own
 * message, because the fix there is a plain string rather than `clsx`. The
 * scanner does read it, so it is a style defect rather than a broken build,
 * and it is one edit away from becoming the broken build.
 *
 * What this deliberately allows:
 *
 * - A call expression, e.g. `clsx(…)`, `composeClassName(…)`, and `buttonVariants({…})`,
 *   which are the sanctioned forms. An interpolation written inside one of
 *   them, e.g. clsx(`bg-${colour}`), is invisible to the scanner for the same
 *   reason and is not caught here, because following a value into a call is
 *   how a rule starts guessing. A reviewer catches it.
 * - A plain string literal, which is the common case.
 * - A variable or a member expression, e.g. `className={props.className}`.
 * - A conditional between two literals, e.g.
 *   `className={isActive ? 'bg-accent' : 'bg-transparent'}`, since the scanner
 *   finds both. The rule does look inside a conditional and a logical
 *   expression for an assembled branch, because that costs nothing.
 * - Every attribute other than `className`.
 *
 * See docs/standards/08-styling.md.
 */
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

/** Node types the rule looks through, because neither defers a value. */
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
