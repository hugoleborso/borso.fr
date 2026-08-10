import { createRuleTester } from './rule-tester.js';
import rule from './no-query-hooks-outside-organisms.js';

const atomFile = 'apps/pragma/site/src/components/atoms/Badge.tsx';
const moleculeFile = 'apps/pragma/site/src/components/molecules/MemberChip.tsx';
const organismFile = 'apps/pragma/site/src/components/organisms/CatalogGrid.tsx';
const queryModuleFile = 'apps/pragma/site/src/lib/queries/songs.ts';

createRuleTester(moleculeFile).run('no-query-hooks-outside-organisms (molecule)', rule, {
  valid: [
    'const label = useMemo(() => formatName(member), [member]);',
    'const [isOpen, setOpen] = useState(false);',
    // Cache metadata rather than a request.
    'const queryClient = useQueryClient();',
    'const pendingCount = useIsFetching();',
    // A translation hook, which is the most common hook in a molecule.
    'const { t } = useTranslation();',
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
