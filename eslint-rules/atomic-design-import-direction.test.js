import { createRuleTester } from './rule-tester.js';
import rule from './atomic-design-import-direction.js';

const atomFile = 'apps/pragma/site/src/components/atoms/Badge.tsx';
const moleculeFile = 'apps/pragma/site/src/components/molecules/MemberChip.tsx';
const organismFile = 'apps/pragma/site/src/components/organisms/CatalogGrid.tsx';
const routeFile = 'apps/pragma/site/src/routes/catalog/CatalogPage.tsx';

// @FollowsBlueprint test-lint-rule
createRuleTester(atomFile).run('atomic-design-import-direction (atom)', rule, {
  valid: [
    "import { clsx } from 'clsx';",
    "import { Icon } from './Icon';",
    "import { Icon } from '../atoms/Icon';",
    "import { formatDuration } from '../../lib/duration.utils';",
    // A folder whose name only starts with a bucket name.
    "import { legend } from '../../lib/organisms-legend';",
    "import { moleculeCount } from '../../lib/molecules-count.utils';",
  ],
  invalid: [
    {
      code: "import { SearchBar } from '../molecules/SearchBar';",
      errors: [{ messageId: 'wrongDirection' }],
    },
    {
      code: "import { CatalogGrid } from '../organisms/CatalogGrid';",
      errors: [{ messageId: 'wrongDirection' }],
    },
    {
      code: "import type { MemberChipProps } from '../molecules/MemberChip';",
      errors: [{ messageId: 'wrongDirection' }],
    },
    // A re-export is an import and an export in one statement, so it creates
    // the same coupling through a path the importing side no longer shows.
    {
      code: "export { SearchBar } from '../molecules/SearchBar';",
      errors: [{ messageId: 'wrongDirection' }],
    },
    {
      code: "export * from '../organisms/CatalogGrid';",
      errors: [{ messageId: 'wrongDirection' }],
    },
  ],
});

createRuleTester(moleculeFile).run('atomic-design-import-direction (molecule)', rule, {
  valid: [
    "import { Avatar } from '../atoms/Avatar';",
    "import { Label } from '../atoms/Label';",
    "import { SearchBar } from './SearchBar';",
  ],
  invalid: [
    {
      code: "import { SetlistEditor } from '../organisms/SetlistEditor';",
      errors: [{ messageId: 'wrongDirection' }],
    },
  ],
});

// An organism is the top of the arrow, and a route composes organisms, so
// neither is in scope.
createRuleTester(organismFile).run('atomic-design-import-direction (organism)', rule, {
  valid: [
    "import { SearchBar } from '../molecules/SearchBar';",
    "import { Badge } from '../atoms/Badge';",
  ],
  invalid: [],
});

createRuleTester(routeFile).run('atomic-design-import-direction (route)', rule, {
  valid: ["import { CatalogGrid } from '../../components/organisms/CatalogGrid';"],
  invalid: [],
});
