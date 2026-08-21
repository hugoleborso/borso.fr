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
    'const queryClient = useQueryClient();',
    'const pendingCount = useIsFetching();',
    'const { t } = useTranslation();',
    "import { replaceEntityById } from '../../lib/queries/entities';\nconst next = replaceEntityById(page, song);",
    "import type { SongRow } from '../../lib/queries/songs';\nconst row: SongRow = given;",
    "import { useSongForm } from '../../lib/forms/song';\nconst form = useSongForm();",
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
