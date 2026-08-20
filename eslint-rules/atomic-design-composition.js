import { isTestPath } from './impurity.js';
import { readComponentBucket } from './site-paths.js';

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
