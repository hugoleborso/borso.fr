import { isPureFile, isTestFile } from './impurity.js';

const ADAPTER_SPECIFIER = /\.adapter(\.js)?$/;

/**
 * A `.core.ts` or `.utils.ts` file may not import an `.adapter.ts`.
 *
 * The dependency between the two runs one way. An adapter is the file that
 * leaves the process, and it is expected to lean on pure logic: the MusicBrainz
 * adapter hands its payload to `musicbrainz.core.ts` to map and to
 * `search-ranking.core.ts` to rank, and the orphan-warning adapter asks
 * `setlist-editor.utils.ts` which ids are new before it writes to the console.
 * That direction is the pattern working.
 *
 * The reverse turns a pure module impure without renaming it, and the pure
 * suffixes carry this repository's strongest gates: 100% per-file coverage and
 * a mutation run that fails on one survivor. Both would still pass, because the
 * test would stub the adapter — so the gates would certify a file that reaches
 * the network as pure. `no-impure-calls-in-core-files` cannot see it either,
 * since it looks for `fetch` and the clock rather than for who was imported.
 *
 * Fix by moving the call to the caller: the adapter and the pure function are
 * both called by the service, in that order, rather than one calling the other.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'A pure module may not import an adapter, which would make it impure.',
    },
    schema: [],
    messages: {
      adapterInPureModule:
        'A {{suffix}} file is pure, so it cannot import "{{specifier}}": an adapter leaves the process. Call both from the service instead, or move the logic this needs into a .core.ts the adapter also imports.',
    },
  },
  create(context) {
    const filename = context.filename;
    if (!isPureFile(filename) || isTestFile(filename)) return {};
    const suffix = filename.endsWith('.utils.ts') ? '.utils.ts' : '.core.ts';
    return {
      ImportDeclaration(node) {
        const specifier = node.source.value;
        if (typeof specifier !== 'string' || !ADAPTER_SPECIFIER.test(specifier)) return;
        context.report({
          node: node.source,
          messageId: 'adapterInPureModule',
          data: { suffix, specifier },
        });
      },
    };
  },
};
