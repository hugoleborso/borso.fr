import { createRuleTester } from './rule-tester.js';
import rule from './no-query-hooks-outside-organisms.js';

const atomFile = 'apps/pragma/site/src/components/atoms/Badge.tsx';
const moleculeFile = 'apps/pragma/site/src/components/molecules/MemberChip.tsx';
const organismFile = 'apps/pragma/site/src/components/organisms/CatalogGrid.tsx';
const queryModuleFile = 'apps/pragma/site/src/lib/queries/songs.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(moleculeFile).run('no-query-hooks-outside-organisms (molecule)', rule, {
  valid: [
    'const label = useMemo(() => formatName(member), [member]);',
    'const [isOpen, setOpen] = useState(false);',
    // Cache metadata rather than a request.
    'const queryClient = useQueryClient();',
    'const pendingCount = useIsFetching();',
    // A translation hook, which is the most common hook in a molecule.
    'const { t } = useTranslation();',
    // The pure cache helpers that live beside the hooks.
    "import { replaceEntityById } from '../../lib/queries/entities';\nconst next = replaceEntityById(page, song);",
    // A type from the query module carries no request.
    "import type { SongRow } from '../../lib/queries/songs';\nconst row: SongRow = given;",
    // A hook from anywhere else is not this rule's business.
    "import { useSongForm } from '../../lib/forms/song';\nconst form = useSongForm();",
    // A folder whose name merely starts the same way.
    "import { useLegend } from '../../lib/queries-legend';\nconst legend = useLegend();",
  ],
  invalid: [
    {
      code: 'const { data } = useQuery({ queryKey: ["songs"] });',
      errors: [{ messageId: 'queryHookOutsideOrganism' }],
    },
    {
      code: 'const save = useMutation({ mutationFn: saveSong });',
      errors: [{ messageId: 'queryHookOutsideOrganism' }],
    },
    {
      code: 'const { data } = useSuspenseQuery({ queryKey: ["bars"] });',
      errors: [{ messageId: 'queryHookOutsideOrganism' }],
    },
    {
      code: 'const { data } = ReactQuery.useInfiniteQuery({ queryKey: ["bars"] });',
      errors: [{ messageId: 'queryHookOutsideOrganism' }],
    },
    // The shape every violation in this repository actually had: the molecule
    // calls the project's wrapper, never the TanStack hook it wraps.
    {
      code: "import { useSongSearch } from '../../lib/queries/songs';\nconst hits = useSongSearch(term);",
      errors: [{ messageId: 'queryHookOutsideOrganism' }],
    },
    {
      code: "import { useSignChartUpload } from '../../lib/queries/uploads';\nconst sign = useSignChartUpload();",
      errors: [{ messageId: 'queryHookOutsideOrganism' }],
    },
    {
      code: "import { useCreateSession as useCreate } from '../../lib/queries/sessions';\nconst create = useCreate();",
      errors: [{ messageId: 'queryHookOutsideOrganism' }],
    },
  ],
});

createRuleTester(atomFile).run('no-query-hooks-outside-organisms (atom)', rule, {
  valid: ['const className = clsx("inline-flex", variantClassName);'],
  invalid: [
    {
      code: 'const { data } = useQuery({ queryKey: ["songs"] });',
      errors: [{ messageId: 'queryHookOutsideOrganism' }],
    },
  ],
});

// An organism is the lowest level allowed to fetch, and a query module is
// where the hooks are defined in the first place.
createRuleTester(organismFile).run('no-query-hooks-outside-organisms (organism)', rule, {
  valid: [
    'const { data } = useQuery({ queryKey: ["songs"] });',
    'const save = useMutation({ mutationFn: saveSong });',
  ],
  invalid: [],
});

createRuleTester(queryModuleFile, { jsx: false }).run(
  'no-query-hooks-outside-organisms (query module)',
  rule,
  {
    valid: ['export const useSongs = () => useQuery({ queryKey: ["songs"] });'],
    invalid: [],
  },
);
