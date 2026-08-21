import { readComponentBucket } from './site-paths.js';

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
