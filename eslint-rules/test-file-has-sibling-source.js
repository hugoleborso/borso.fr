import { existsSync } from 'node:fs';
import { isGatedFile, isTestFile } from './impurity.js';

const MESSAGE =
  'A `.core.ts`, `.utils.ts`, `.adapter.ts` or `.schema.ts` file ships with a sibling `.test.ts`. ' +
  'The coverage and mutation gates both pass a file that nothing tests, because a module no test ' +
  'loads reports no uncovered line, so the missing suite is invisible until the number is read. ' +
  'See docs/standards/10-testing.md.';

const SOURCE_EXTENSION_PATTERN = /\.tsx?$/;

const TEST_EXTENSIONS = ['.test.ts', '.test.tsx'];

const UNNAMED_FILENAMES = new Set(['<input>', '<text>']);

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require a sibling test beside every gated file.' },
    schema: [],
    messages: { missingSiblingTest: MESSAGE },
  },
  create(context) {
    const filename = context.filename;
    if (UNNAMED_FILENAMES.has(filename) || !isGatedFile(filename) || isTestFile(filename)) {
      return {};
    }
    return {
      'Program:exit'(node) {
        const withoutExtension = filename.replace(SOURCE_EXTENSION_PATTERN, '');
        const hasSiblingTest = TEST_EXTENSIONS.some((extension) =>
          existsSync(`${withoutExtension}${extension}`),
        );
        if (!hasSiblingTest) {
          context.report({ node, messageId: 'missingSiblingTest' });
        }
      },
    };
  },
};
