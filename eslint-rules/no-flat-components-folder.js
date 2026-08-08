import { isTestFile } from './impurity.js';
import { toPosixPath } from './site-paths.js';

/**
 * The folder tree is the design review. A reviewer answers "what primitives
 * does this application have" by listing `atoms/`, and the answer is only true
 * while every component is in one of the three buckets.
 *
 * A fourth folder is the same defect as no folder at all. `components/admin/`
 * reads like an answer, and it is a second axis, so the question "what atoms
 * exist" now needs every folder opened, and a component that grew a query hook
 * and half a screen's state hides in there as easily as it would in a flat
 * list. Sorting by feature is what `routes/` already does.
 *
 * A component left loose also skips the question the buckets force, which is
 * "what does this import", and that question is what stops an organism's worth
 * of state from growing inside something everybody treats as a primitive.
 *
 * The bucket has to be the first folder under `components/`, so
 * `organisms/admin/CorrectionPanel.tsx` is fine and `admin/organisms/…` is
 * not. The report lands on the program node, because the defect is the file's
 * location and there is no expression to point at.
 *
 * What this deliberately allows:
 *
 * - A `.ts` file anywhere under `components/`, e.g. a shared props type or a
 *   sibling `.utils.ts` helper, since the standard places components and not
 *   modules.
 * - A test file, which sits beside the component it covers.
 * - Any depth inside a bucket, e.g. `organisms/admin/CorrectionPanel.tsx`.
 *
 * See docs/standards/05-frontend-architecture.md.
 */
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
