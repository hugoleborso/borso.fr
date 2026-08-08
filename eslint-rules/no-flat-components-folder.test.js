import { createRuleTester } from './rule-tester.js';
import rule from './no-flat-components-folder.js';

const componentSource = 'export function Leaderboard() { return null; }';

createRuleTester().run('no-flat-components-folder', rule, {
  valid: [
    {
      filename: 'apps/pragma/site/src/components/atoms/Badge.tsx',
      code: componentSource,
    },
    {
      filename: 'apps/pragma/site/src/components/molecules/MemberChip.tsx',
      code: componentSource,
    },
    {
      filename: 'apps/pragma/site/src/components/organisms/CatalogGrid.tsx',
      code: componentSource,
    },
    {
      filename: 'apps/pragma/site/src/routes/catalog/CatalogPage.tsx',
      code: componentSource,
    },
    // A module rather than a component.
    {
      filename: 'apps/pragma/site/src/components/component-names.utils.ts',
      code: 'export const names = [];',
    },
    // A test sits beside the component it covers.
    {
      filename: 'apps/pragma/site/src/components/Leaderboard.test.tsx',
      code: componentSource,
    },
    // A folder that merely ends in `components`.
    {
      filename: 'apps/pragma/site/src/lib/subcomponents/Legend.tsx',
      code: componentSource,
    },
    // The back end has no components folder.
    {
      filename: 'apps/pragma/api/src/songs/songs.service.ts',
      code: 'export const songs = [];',
    },
  ],
  invalid: [
    {
      filename: 'apps/last-loop-lepin/site/src/components/Leaderboard.tsx',
      code: componentSource,
      errors: [{ messageId: 'flatComponent' }],
    },
    {
      filename: 'apps/last-loop-lepin/site/src/components/CourseMap.tsx',
      code: 'export function CourseMap() { return null; }',
      errors: [{ messageId: 'flatComponent' }],
    },
  ],
});
