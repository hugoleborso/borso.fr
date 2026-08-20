import { isTestFile } from './impurity.js';
import { toPosixPath } from './site-paths.js';

const MESSAGE =
  'Every component lives in `components/atoms/`, `components/molecules/`, or ' +
  '`components/organisms/`. Put it in `atoms/` when it imports no other component, in ' +
  '`molecules/` when it imports only atoms, and in `organisms/` when it imports a molecule, ' +
  'calls a query hook, or holds flow state. A fourth folder such as `admin/` sorts by feature ' +
  'instead, which is what `routes/` is for, and it hides the question the buckets answer. ' +
  'See docs/standards/05-frontend-architecture.md.';

const COMPONENTS_FOLDER_PATTERN = /(^|\/)components\/(.+)$/;

const COMPONENT_EXTENSION = '.tsx';

const BUCKETS = new Set(['atoms', 'molecules', 'organisms']);

function isOutsideEveryBucket(filename) {
  const match = COMPONENTS_FOLDER_PATTERN.exec(filename);
  if (match === null) {
    return false;
  }
  const pathBelowComponents = match[2];
  if (!pathBelowComponents.endsWith(COMPONENT_EXTENSION)) {
    return false;
  }
  const [firstFolder, ...remainingPath] = pathBelowComponents.split('/');
  return remainingPath.length === 0 || !BUCKETS.has(firstFolder);
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require every component to live in one of the three buckets.' },
    schema: [],
    messages: { flatComponent: MESSAGE },
  },
  create(context) {
    const filename = toPosixPath(context.filename);
    if (isTestFile(filename) || !isOutsideEveryBucket(filename)) {
      return {};
    }
    return {
      Program(node) {
        context.report({ node, messageId: 'flatComponent' });
      },
    };
  },
};
