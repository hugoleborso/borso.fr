import { existsSync } from 'node:fs';
import { isPureFile, isTestFile } from './impurity.js';

/**
 * A `.core.ts` or `.utils.ts` file is under the coverage gate and the mutation
 * gate, and both gates are satisfied by a file that has no tests at all,
 * because a file nothing imports contributes no uncovered line to a run that
 * never loads it. The missing sibling is therefore invisible until someone
 * notices the number is wrong.
 *
 * The rule reads the filesystem in `Program:exit`, which is the one place a
 * lint rule can ask a question about a file that is not the file being linted.
 * It costs one `existsSync` per pure file.
 *
 * The name comes from docs/standards/12-linting-and-gates.md, and it reads
 * backwards: the rule fires on the source file that has no test, and not on a
 * test file that has no source.
 *
 * What this deliberately allows:
 *
 * - A `.core.test.ts` or `.utils.test.ts` file, which is the sibling itself.
 * - Either extension on either side, so `chart.utils.tsx` is satisfied by
 *   `chart.utils.test.ts` and by `chart.utils.test.tsx`.
 * - Any file without the two suffixes, since the gates only cover those.
 *
 * See docs/standards/10-testing.md.
 */
const MESSAGE =
  'A `.core.ts` or `.utils.ts` file ships with a sibling `.test.ts`. The coverage and mutation ' +
  'gates both pass a pure file that nothing tests, because a module no test loads reports no ' +
  'uncovered line, so the missing suite is invisible until the number is read. ' +
  'See docs/standards/10-testing.md.';

const SOURCE_EXTENSION_PATTERN = /\.tsx?$/;

const TEST_EXTENSIONS = ['.test.ts', '.test.tsx'];

const UNNAMED_FILENAMES = new Set(['<input>', '<text>']);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require a sibling test beside every pure file.' },
    schema: [],
    messages: { missingSiblingTest: MESSAGE },
  },
  create(context) {
    const filename = context.filename;
    if (UNNAMED_FILENAMES.has(filename) || !isPureFile(filename) || isTestFile(filename)) {
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
