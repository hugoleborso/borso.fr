import { readComponentBucket } from './site-paths.js';

/**
 * An organism is the lowest level allowed to fetch. Below it, a molecule that
 * fetches stops being a thing you can render from a story, a test, or a second
 * screen, because rendering it now needs a query client, a network stub, and
 * the right cache state.
 *
 * The fix is always the same, which is to hoist the query into the organism
 * and pass the data down as props, so the molecule renders what it is given.
 *
 * Two shapes count as fetching, because in this repository they are the same
 * act written two ways. The first is a TanStack hook called by its own name.
 * The second is a call to a `use…` binding imported from `lib/queries/`, which
 * is where standard 06 puts every hook wrapping a query, so such a call is a
 * fetch by construction rather than by guess. The second shape is the common
 * one: a molecule reaches for `useSongSearch` rather than for `useQuery`, and
 * reading only the four hook names missed every violation this repository
 * actually had.
 *
 * What this deliberately allows:
 *
 * - `useQueryClient`, `useIsFetching`, and the rest of the TanStack hooks that
 *   read cache metadata rather than start a request. Only the four hooks the
 *   standard names are matched, and matched exactly.
 * - A type imported from `lib/queries/`, which carries no request.
 * - The pure cache helpers that live beside the hooks, e.g.
 *   `replaceEntityById` and `applyEntryPatch`. They transform a cache page a
 *   caller already holds, and React's own naming rule is what separates them
 *   from the hooks: a hook is named `use…` and a helper is not.
 * - A hook that wraps `useQuery` somewhere other than `lib/queries/`. Standard
 *   06 says the wrappers live there, so a rule that also matched `use…` names
 *   from anywhere would misfire on every other hook.
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

const QUERY_MODULE_PATTERN = /(^|\/)lib\/queries(\/|$)/;

const HOOK_NAME_PATTERN = /^use[A-Z]/;

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

function listQueryHookBindings(node) {
  const source = node.source.value;
  if (typeof source !== 'string' || !QUERY_MODULE_PATTERN.test(source)) {
    return [];
  }
  if (node.importKind === 'type') {
    return [];
  }
  return node.specifiers
    .filter((specifier) => (specifier.importKind ?? 'value') === 'value')
    .map((specifier) => specifier.local.name)
    .filter((name) => HOOK_NAME_PATTERN.test(name));
}

// @FollowsBlueprint lint-rule
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
    const queryHookBindings = new Set();
    const reportedCalls = [];
    return {
      ImportDeclaration(node) {
        for (const binding of listQueryHookBindings(node)) {
          queryHookBindings.add(binding);
        }
      },
      CallExpression(node) {
        const hook = readCalleeName(node.callee);
        if (hook === null) {
          return;
        }
        if (QUERY_HOOKS.has(hook) || queryHookBindings.has(hook)) {
          reportedCalls.push({ node: node.callee, hook });
        }
      },
      'Program:exit'() {
        for (const call of reportedCalls) {
          context.report({
            node: call.node,
            messageId: 'queryHookOutsideOrganism',
            data: { bucket, hook: call.hook },
          });
        }
      },
    };
  },
};
