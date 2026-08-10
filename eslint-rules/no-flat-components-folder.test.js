import { createRuleTester } from './rule-tester.js';
import rule from './no-flat-components-folder.js';

const componentSource = 'export function Leaderboard() { return null; }';

// @FollowsBlueprint test-lint-rule
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
    // Any depth inside a bucket, which is a bucket that grew a subfolder
    // rather than a fourth bucket.
    {
      filename: 'apps/last-loop-lepin/site/src/components/organisms/admin/CorrectionPanel.tsx',
      code: componentSource,
    },
    {
      filename: 'apps/pragma/site/src/routes/catalog/CatalogPage.tsx',
      code: componentSource,
    },
    // Modules rather than components, at either depth.
    {
      filename: 'apps/pragma/site/src/components/component-names.utils.ts',
      code: 'export const names = [];',
    },
    {
      filename: 'apps/last-loop-lepin/site/src/components/admin/correction.core.ts',
      code: 'export const rules = [];',
    },
    // Tests sit beside the component they cover, in either place.
    {
      filename: 'apps/pragma/site/src/components/Leaderboard.test.tsx',
      code: componentSource,
    },
    {
      filename: 'apps/last-loop-lepin/site/src/components/admin/SetupPanel.test.tsx',
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
    // Loose in `components/`.
    {
      filename: 'apps/last-loop-lepin/site/src/components/Leaderboard.tsx',
      code: componentSource,
      errors: [{ messageId: 'flatComponent' }],
    },
    {
      filename: 'apps/borsouvertures/site/components/TopBar.tsx',
      code: 'export function TopBar() { return null; }',
      errors: [{ messageId: 'flatComponent' }],
    },
    // A fourth bucket, which sorts by feature and answers a different
    // question from the three.
    {
      filename: 'apps/last-loop-lepin/site/src/components/admin/SetupPanel.tsx',
      code: 'export function SetupPanel() { return null; }',
      errors: [{ messageId: 'flatComponent' }],
    },
    {
      filename: 'apps/pragma/site/src/components/shared/Card.tsx',
      code: 'export function Card() { return null; }',
      errors: [{ messageId: 'flatComponent' }],
    },
    // A bucket name that is not the first folder under `components/` does not
    // count, because the three buckets sit directly under it.
    {
      filename: 'apps/pragma/site/src/components/admin/atoms/Toggle.tsx',
      code: 'export function Toggle() { return null; }',
      errors: [{ messageId: 'flatComponent' }],
    },
    // A file named after a bucket is still a loose component.
    {
      filename: 'apps/pragma/site/src/components/atoms.tsx',
      code: 'export function Atoms() { return null; }',
      errors: [{ messageId: 'flatComponent' }],
    },
  ],
});
