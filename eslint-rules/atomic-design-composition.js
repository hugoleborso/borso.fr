import { isTestPath } from './impurity.js';
import { readComponentBucket } from './site-paths.js';

/**
 * A molecule is a composition of atoms and an organism is a composition of
 * molecules and atoms, so a file in either bucket that imports no component at
 * all is not the thing its folder says it is. It is either a primitive filed
 * one bucket too high, or a primitive still inlined as raw markup, and both
 * read the same from the folder tree: a bucket that looks populated while the
 * atoms it should be made of do not exist.
 *
 * That matters more here than the usual taxonomy argument, because the folder
 * tree is the review surface. A reviewer answers "what primitives does this
 * application have" by listing `atoms/`, and every primitive left inlined in a
 * molecule is missing from that answer.
 *
 * The direction rule beside this one keeps the dependency arrow pointing one
 * way. This one asks that the arrow exist.
 *
 * What this deliberately allows:
 *
 * - An import from the file's own bucket. `atomic-design-import-direction`
 *   already decides which buckets a file may reach, and an organism composed
 *   of organisms is composing something.
 * - Any import spelling that resolves into a component bucket, so the relative
 *   `../atoms/Button` and the aliased `@/components/atoms/Button` both count.
 * - Everything outside `components/molecules/` and `components/organisms/`,
 *   including atoms, routes, hooks, and back end files.
 * - A re-export module, which composes nothing because it renders nothing.
 * - A test beside the component, which renders markup to make an assertion
 *   rather than to be composed.
 *
 * See docs/standards/05-frontend-architecture.md.
 */
const MESSAGE =
  'A component in `{{bucket}}/` imports no component. {{expectation}} When this file renders ' +
  'only raw markup, extract the primitive it inlines into `components/atoms/` and compose it ' +
  'here; when it renders one element and owns no composition, it is an atom and belongs in ' +
  '`components/atoms/`. See docs/standards/05-frontend-architecture.md.';

const EXPECTATION_BY_BUCKET = new Map([
  ['molecules', 'A molecule is a composition of atoms.'],
  ['organisms', 'An organism is a composition of molecules and atoms.'],
]);

const COMPONENT_BUCKET_IN_SOURCE = /(^|\/)components\/(atoms|molecules|organisms)(\/|$)/;

/**
 * A relative source is read against the importing file's own bucket, so
 * `../atoms/Button` from a molecule resolves to `components/atoms/Button`
 * without the rule needing a module resolver. Anything else is matched as
 * written, which is what makes an alias such as `@/components/atoms/Button`
 * count.
 */
function isComponentImport(source, bucket) {
  const resolved = source.startsWith('.') ? `components/${bucket}/${source}` : source;
  return COMPONENT_BUCKET_IN_SOURCE.test(normalizeRelativeSegments(resolved));
}

function normalizeRelativeSegments(source) {
  const resolved = [];
  for (const segment of source.split('/')) {
    if (segment === '.' || segment === '') continue;
    if (segment === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }
  return resolved.join('/');
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Keep molecules and organisms compositions of smaller components.' },
    schema: [],
    messages: { composesNothing: MESSAGE },
  },
  create(context) {
    const bucket = readComponentBucket(context.filename);
    const expectation = EXPECTATION_BY_BUCKET.get(bucket);
    if (expectation === undefined || isTestPath(context.filename)) {
      return {};
    }
    let hasComponentImport = false;
    let hasMarkup = false;
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source === 'string' && isComponentImport(source, bucket)) {
          hasComponentImport = true;
        }
      },
      JSXElement() {
        hasMarkup = true;
      },
      'Program:exit'(node) {
        if (hasComponentImport || !hasMarkup) {
          return;
        }
        context.report({
          node,
          messageId: 'composesNothing',
          data: { bucket, expectation },
        });
      },
    };
  },
};
