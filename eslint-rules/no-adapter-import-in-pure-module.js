import { isPureFile, isTestFile } from './impurity.js';

const ADAPTER_SPECIFIER = /\.adapter(\.js)?$/;

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
