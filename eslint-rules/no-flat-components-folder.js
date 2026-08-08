import { isTestFile } from './impurity.js';
import { toPosixPath } from './site-paths.js';

/**
 * The folder tree is the design review. A reviewer answers "what primitives
 * does this application have" by listing `atoms/`, and the answer is only true
 * while every component is in one of the three buckets.
 *
 * A component left directly in `components/` also skips the question the
 * buckets force, which is "what does this import", and that question is what
 * stops an organism's worth of state from growing inside something everybody
 * treats as a primitive.
 *
 * The report lands on the program node, because the defect is the file's
 * location and there is no expression to point at.
 *
 * What this deliberately allows:
 *
 * - A `.ts` file directly under `components/`, e.g. a shared props type or a
 *   `.utils.ts` helper, since the standard places components and not modules.
 * - A test file, which sits beside the component it covers.
 * - A component in some other subfolder of `components/`, e.g.
 *   `components/admin/`. That is a different defect, which is a fourth bucket
 *   rather than a flat folder, and a reviewer names it better than a rule.
 *
 * See docs/standards/05-frontend-architecture.md.
 */
const MESSAGE =
  'A component may not sit directly in `components/`. Move it to `components/atoms/` when it ' +
  'imports no other component, to `components/molecules/` when it imports only atoms, and to ' +
  '`components/organisms/` when it imports a molecule, calls a query hook, or holds flow ' +
  'state. See docs/standards/05-frontend-architecture.md.';

const FLAT_COMPONENT_PATTERN = /(^|\/)components\/[^/]+\.tsx$/;

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid a component placed directly under `components/`.' },
    schema: [],
    messages: { flatComponent: MESSAGE },
  },
  create(context) {
    const filename = toPosixPath(context.filename);
    if (isTestFile(filename) || !FLAT_COMPONENT_PATTERN.test(filename)) {
      return {};
    }
    return {
      Program(node) {
        context.report({ node, messageId: 'flatComponent' });
      },
    };
  },
};
