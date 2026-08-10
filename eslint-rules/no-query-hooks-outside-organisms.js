import { readComponentBucket } from './site-paths.js';

/**
 * An organism is the lowest level allowed to fetch. Below it, a molecule that
 * calls `useQuery` stops being a thing you can render from a story, a test, or
 * a second screen, because rendering it now needs a query client, a network
 * stub, and the right cache state.
 *
 * The fix is always the same, which is to hoist the query into the organism
 * and pass the data down as props, so the molecule renders what it is given.
 *
 * What this deliberately allows:
 *
 * - `useQueryClient`, `useIsFetching`, and the rest of the TanStack hooks that
 *   read cache metadata rather than start a request. Only the four hooks the
 *   standard names are matched, and matched exactly.
 * - A project hook that wraps `useQuery`, e.g. `useRunner` from
 *   `lib/queries/runner.ts`, called inside a molecule. Catching that needs to
 *   follow the call into another module, and a rule that guesses which
 *   `use…` names fetch would misfire on every other hook.
 * - Everything outside `components/atoms/` and `components/molecules/`.
 *
 * See docs/standards/05-frontend-architecture.md and
 * docs/standards/06-data-fetching.md.
 */
const MESSAGE =
  'A component in `{{bucket}}/` may not call `{{hook}}`. An organism is the lowest level ' +
  'allowed to fetch, so hoist the query into the organism that renders this component and ' +
  'pass the data down as props. See docs/standards/05-frontend-architecture.md.';

const QUERY_HOOKS = new Set(['useQuery', 'useMutation', 'useInfiniteQuery', 'useSuspenseQuery']);

const BUCKETS_WITHOUT_QUERIES = new Set(['atoms', 'molecules']);

function readCalleeName(callee) {
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier'
  ) {
    return callee.property.name;
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Keep TanStack Query hooks in organisms and above.' },
    schema: [],
    messages: { queryHookOutsideOrganism: MESSAGE },
  },
  create(context) {
    const bucket = readComponentBucket(context.filename);
    if (bucket === null || !BUCKETS_WITHOUT_QUERIES.has(bucket)) {
      return {};
    }
    return {
      CallExpression(node) {
        const hook = readCalleeName(node.callee);
        if (hook !== null && QUERY_HOOKS.has(hook)) {
          context.report({
            node: node.callee,
            messageId: 'queryHookOutsideOrganism',
            data: { bucket, hook },
          });
        }
      },
    };
  },
};
