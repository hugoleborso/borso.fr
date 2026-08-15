import path from 'node:path';
import { createRuleTester } from './rule-tester.js';
import rule from './test-file-has-sibling-source.js';

// The rule asks the filesystem, so the cases point at real paths in this
// repository rather than at fixtures, which keeps the suite from adding
// `.core.ts` files that the coverage gate would then want tests for.
const repositoryRoot = path.resolve(import.meta.dirname, '..');
const pureFile = (relativePath) => path.join(repositoryRoot, relativePath);

const sourceWithSiblingTest = pureFile(
  'apps/last-loop-lepin/api/src/helpers/geo/haversine.utils.ts',
);
const coreWithSiblingTest = pureFile('apps/last-loop-lepin/api/src/ranking/ranking.core.ts');
const sourceWithoutSiblingTest = pureFile(
  'apps/last-loop-lepin/api/src/ranking/imaginary-ranking.core.ts',
);
const siblingTestItself = pureFile('apps/last-loop-lepin/api/src/ranking/ranking.core.test.ts');
const impureSource = pureFile('apps/last-loop-lepin/api/src/ranking/ranking.service.ts');
const adapterWithSiblingTest = pureFile('apps/pragma/api/src/songs/musicbrainz.adapter.ts');
const adapterWithoutSiblingTest = pureFile('apps/pragma/api/src/songs/imaginary.adapter.ts');
const schemaWithSiblingTest = pureFile('apps/pragma/api/src/members/members.schema.ts');
const schemaWithoutSiblingTest = pureFile('apps/pragma/api/src/members/imaginary.schema.ts');

// @FollowsBlueprint test-lint-rule
createRuleTester(sourceWithSiblingTest, { jsx: false }).run('test-file-has-sibling-source', rule, {
  valid: [
    { code: 'export const metres = 1;' },
    { code: 'export const metres = 1;', filename: coreWithSiblingTest },
    // An adapter is gated too, though it is the opposite of pure.
    { code: 'export const search = () => null;', filename: adapterWithSiblingTest },
    { code: 'export const memberSchema = {};', filename: schemaWithSiblingTest },
    // The sibling itself, which has no sibling of its own.
    { code: 'export const cases = [];', filename: siblingTestItself },
    // A file the coverage and mutation gates do not cover.
    { code: 'export const service = {};', filename: impureSource },
    // A file that never touched the disk, e.g. a snippet linted from stdin.
    { code: 'export const metres = 1;', filename: '<input>' },
  ],
  invalid: [
    {
      code: 'export const ranking = [];',
      filename: sourceWithoutSiblingTest,
      errors: [{ messageId: 'missingSiblingTest' }],
    },
    {
      code: 'export const search = () => null;',
      filename: adapterWithoutSiblingTest,
      errors: [{ messageId: 'missingSiblingTest' }],
    },
    {
      code: 'export const memberSchema = {};',
      filename: schemaWithoutSiblingTest,
      errors: [{ messageId: 'missingSiblingTest' }],
    },
    {
      code: 'export const palette = [];',
      filename: pureFile('apps/pragma/site/src/lib/imaginary-palette.utils.ts'),
      errors: [{ messageId: 'missingSiblingTest' }],
    },
  ],
});
