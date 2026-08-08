/**
 * Ported from `biome-plugins/no-type-assertion-except-unknown.grit`.
 *
 * Allows `as unknown` (a single step, for JSON parsing escape hatches) and
 * `as const` (literal narrowing). Rejects everything else, including the
 * chained `as unknown as Foo`, which the grit version also rejected because
 * its outer assertion has a named type.
 *
 * See docs/standards/03-typing.md.
 */
const MESSAGE =
  'Type assertions are restricted. Allowed: `as unknown` (single step, for JSON-parsing ' +
  'escape hatches) and `as const` (literal narrowing). For narrower typing after ' +
  '`as unknown`, use a TypeScript type guard or a Zod schema. ' +
  'See docs/standards/03-typing.md.';

function isAsConst(typeAnnotation) {
  return (
    typeAnnotation.type === 'TSTypeReference' &&
    typeAnnotation.typeName.type === 'Identifier' &&
    typeAnnotation.typeName.name === 'const'
  );
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Allow only `as unknown` and `as const` type assertions.' },
    schema: [],
    messages: { restricted: MESSAGE },
  },
  create(context) {
    return {
      TSAsExpression(node) {
        if (node.typeAnnotation.type === 'TSUnknownKeyword') {
          return;
        }
        if (isAsConst(node.typeAnnotation)) {
          return;
        }
        context.report({ node: node.typeAnnotation, messageId: 'restricted' });
      },
      TSTypeAssertion(node) {
        context.report({ node, messageId: 'restricted' });
      },
    };
  },
};
