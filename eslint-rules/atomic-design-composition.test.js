import { createRuleTester } from './rule-tester.js';
import rule from './atomic-design-composition.js';

const atomFile = 'apps/pragma/site/src/components/atoms/Badge.tsx';
const moleculeFile = 'apps/pragma/site/src/components/molecules/MemberChip.tsx';
const organismFile = 'apps/pragma/site/src/components/organisms/CatalogGrid.tsx';
const routeFile = 'apps/pragma/site/src/routes/catalog/CatalogPage.tsx';
const aliasedMoleculeFile = 'apps/borsouvertures/site/components/molecules/ModeToggle.tsx';

// @FollowsBlueprint test-lint-rule
createRuleTester(moleculeFile).run('atomic-design-composition (molecule)', rule, {
  valid: [
    "import { Avatar } from '../atoms/Avatar';\nexport const Chip = () => <span><Avatar /></span>;",
    "import { SearchBar } from './SearchBar';\nexport const Row = () => <div><SearchBar /></div>;",
    "export type { MemberChipProps } from './MemberChip.types';",
    "export const MEMBER_TONES = ['warm', 'cool'];",
  ],
  invalid: [
    {
      code: "import { useTranslation } from 'react-i18next';\nexport const Hint = () => <p>hint</p>;",
      errors: [{ messageId: 'composesNothing' }],
    },
    {
      code: "import { formatScore } from '../../lib/score.utils';\nimport { legend } from '../../lib/organisms-legend';\nexport const Score = () => <span>1</span>;",
      errors: [{ messageId: 'composesNothing' }],
    },
  ],
});

createRuleTester(organismFile).run('atomic-design-composition (organism)', rule, {
  valid: [
    "import { SearchBar } from '../molecules/SearchBar';\nexport const Grid = () => <div><SearchBar /></div>;",
    "import { Badge } from '../atoms/Badge';\nexport const Grid = () => <div><Badge /></div>;",
    "import { SetlistEditor } from './SetlistEditor';\nexport const Grid = () => <div><SetlistEditor /></div>;",
  ],
  invalid: [
    {
      code: 'export const Grid = () => <div>nothing</div>;',
      errors: [{ messageId: 'composesNothing' }],
    },
  ],
});

createRuleTester(aliasedMoleculeFile).run('atomic-design-composition (alias)', rule, {
  valid: [
    "import { ToggleSlider } from '@/components/atoms/ToggleSlider';\nexport const Toggle = () => <ToggleSlider />;",
  ],
  invalid: [
    {
      code: 'import { setMode } from \'@/state/appState\';\nexport const Toggle = () => <button type="button" />;',
      errors: [{ messageId: 'composesNothing' }],
    },
  ],
});

createRuleTester(atomFile).run('atomic-design-composition (atom)', rule, {
  valid: ['export const Badge = () => <span>1</span>;'],
  invalid: [],
});

createRuleTester(routeFile).run('atomic-design-composition (route)', rule, {
  valid: ['export const CatalogPage = () => <main>catalog</main>;'],
  invalid: [],
});

createRuleTester('apps/pragma/site/src/components/organisms/CatalogGrid.test.tsx').run(
  'atomic-design-composition (test)',
  rule,
  {
    valid: ["it('renders', () => render(<div>catalog</div>));"],
    invalid: [],
  },
);
