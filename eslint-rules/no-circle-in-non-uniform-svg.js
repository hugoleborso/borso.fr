/**
 * Ported from `biome-plugins/no-circle-in-non-uniform-svg.grit`.
 *
 * An `<svg preserveAspectRatio="none">` scales its x and y axes by different
 * factors, so a `<circle>` inside it renders as an oval.
 *
 * See docs/knowledge/svg-preserveaspectratio-distorts-non-uniform.md.
 */
const MESSAGE =
  'A <circle> or <ellipse> inside an <svg preserveAspectRatio="none"> renders as an oval, ' +
  'because non-uniform scaling stretches the x and y axes by different factors. Keep the ' +
  'stretched path in the SVG, and overlay the dots as CSS rounded-full elements. ' +
  'See docs/knowledge/svg-preserveaspectratio-distorts-non-uniform.md.';

const ROUND_ELEMENT_NAMES = new Set(['circle', 'ellipse']);

function readElementName(jsxElement) {
  const name = jsxElement.openingElement.name;
  return name.type === 'JSXIdentifier' ? name.name : null;
}

function hasNonUniformAspectRatio(jsxElement) {
  return jsxElement.openingElement.attributes.some(
    (attribute) =>
      attribute.type === 'JSXAttribute' &&
      attribute.name.type === 'JSXIdentifier' &&
      attribute.name.name === 'preserveAspectRatio' &&
      attribute.value !== null &&
      attribute.value.type === 'Literal' &&
      attribute.value.value === 'none',
  );
}

function collectRoundDescendants(jsxElement, found) {
  for (const child of jsxElement.children) {
    if (child.type !== 'JSXElement') {
      continue;
    }
    const childName = readElementName(child);
    if (childName !== null && ROUND_ELEMENT_NAMES.has(childName)) {
      found.push(child);
    }
    collectRoundDescendants(child, found);
  }
  return found;
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid round SVG markers inside a non-uniformly scaled SVG.' },
    schema: [],
    messages: { roundMarker: MESSAGE },
  },
  create(context) {
    return {
      JSXElement(node) {
        if (readElementName(node) !== 'svg' || !hasNonUniformAspectRatio(node)) {
          return;
        }
        for (const roundElement of collectRoundDescendants(node, [])) {
          context.report({ node: roundElement, messageId: 'roundMarker' });
        }
      },
    };
  },
};
