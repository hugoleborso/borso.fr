import { toPosixPath } from './site-paths.js';

const MESSAGE =
  "`{{method}}` records a fresh fetch, so it clears the invalidation another member's write " +
  'set and hides that change behind an entry marked fresh, across a reload too. Write through ' +
  '`writeKeepingStaleness` or `writeEachKeepingStaleness` from `lib/queries/cache-write.queries.ts`. ' +
  'A write to a key no stale message can have reached yet, such as seeding the detail of a row ' +
  'this mutation just created, may disable this rule on the line and name why the key is new. ' +
  'See docs/standards/06-data-fetching.md.';

const CACHE_WRITE_METHODS = new Set(['setQueryData', 'setQueriesData']);

const CACHE_WRITE_MODULE_PATTERN = /(^|\/)lib\/queries\/cache-write\.queries\.ts$/;

export function readCacheWriteMethod(callee) {
  return callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    CACHE_WRITE_METHODS.has(callee.property.name)
    ? callee.property.name
    : null;
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Route every query cache write through the staleness keeping helper.' },
    schema: [],
    messages: { directCacheWrite: MESSAGE },
  },
  create(context) {
    if (CACHE_WRITE_MODULE_PATTERN.test(toPosixPath(context.filename))) {
      return {};
    }
    return {
      CallExpression(node) {
        const method = readCacheWriteMethod(node.callee);
        if (method !== null) {
          context.report({ node: node.callee, messageId: 'directCacheWrite', data: { method } });
        }
      },
    };
  },
};
