import rule from './no-refetch-of-optimistically-written-query.js';
import { createRuleTester } from './rule-tester.js';

const KEYS = `
  const editionKeys = {
    all: ['editions'],
    list: () => [...editionKeys.all, 'list'],
    current: () => [...editionKeys.all, 'current'],
    detail: (slug) => [...editionKeys.all, 'detail', slug],
  };
`;

function optimisticMutation(body) {
  return `${KEYS}
  useMutation({
    mutationFn: write,
    onMutate: () => {
      const listKey = editionKeys.list();
      queryClient.setQueryData(listKey, (old) => drop(old));
      return { previous: queryClient.getQueryData(listKey) };
    },
    ${body}
  });`;
}

const REFETCHES_A_SIBLING_KEY = optimisticMutation(`
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: editionKeys.current() });
    },`);

const REFETCHES_A_SIBLING_KEY_BEHIND_A_HELPER = `${KEYS}
  function refetchTheProjection(queryClient) {
    void queryClient.invalidateQueries({ queryKey: editionKeys.current() });
  }
  useMutation({
    mutationFn: write,
    onMutate: () => {
      queryClient.setQueryData(editionKeys.list(), (old) => drop(old));
    },
    onSettled: () => {
      refetchTheProjection(queryClient);
    },
  });`;

const PESSIMISTIC_REFETCH_OF_THE_SAME_KEY = `${KEYS}
  useMutation({
    mutationFn: create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: editionKeys.list() });
    },
  });`;

const REFETCHES_THE_WRITTEN_KEY = optimisticMutation(`
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: editionKeys.list() });
    },`);

const REFETCHES_A_PREFIX_OF_THE_WRITTEN_KEY = optimisticMutation(`
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: editionKeys.all });
    },`);

const REFETCHES_EVERYTHING = optimisticMutation(`
    onSettled: () => {
      void queryClient.invalidateQueries();
    },`);

const REFETCHES_THE_WRITTEN_KEY_IN_ON_SUCCESS = optimisticMutation(`
    onSuccess: () => {
      void queryClient.refetchQueries({ queryKey: editionKeys.list() });
    },`);

const REFETCHES_THE_WRITTEN_KEY_BEHIND_A_HELPER = `${KEYS}
  function refetchTheListTheClientCannotPredict(queryClient) {
    void queryClient.invalidateQueries({ queryKey: editionKeys.all });
  }
  useMutation({
    mutationFn: write,
    onMutate: () => {
      queryClient.setQueryData(editionKeys.list(), (old) => drop(old));
    },
    onSettled: () => {
      refetchTheListTheClientCannotPredict(queryClient);
    },
  });`;

const REFETCHES_THE_WRITTEN_KEY_BEHIND_A_HELPER_DECLARED_BELOW = `${KEYS}
  useMutation({
    mutationFn: write,
    onMutate: () => {
      queryClient.setQueryData(editionKeys.list(), (old) => drop(old));
    },
    onSettled: () => {
      refetchLater(queryClient);
    },
  });
  const refetchLater = (queryClient) => {
    void queryClient.invalidateQueries({ queryKey: editionKeys.list() });
  };`;

const REFETCHES_A_KEY_FROM_A_FACTORY_DECLARED_ELSEWHERE = `
  import { setlistKeys } from './setlists.queries';
  useMutation({
    mutationFn: write,
    onMutate: () => {
      queryClient.setQueryData(setlistKeys.entriesOf(id), (old) => drop(old));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: setlistKeys.list() });
    },
  });`;

const REFETCHES_A_DYNAMIC_SIBLING_OF_THE_WRITTEN_KEY = optimisticMutation(`
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: editionKeys.detail(variables.slug) });
    },`);

// @FollowsBlueprint test-lint-rule
createRuleTester('apps/last-loop-lepin/site/src/lib/queries/editions.ts', { jsx: false }).run(
  'no-refetch-of-optimistically-written-query',
  rule,
  {
    valid: [
      REFETCHES_A_SIBLING_KEY,
      REFETCHES_A_SIBLING_KEY_BEHIND_A_HELPER,
      REFETCHES_A_DYNAMIC_SIBLING_OF_THE_WRITTEN_KEY,
      PESSIMISTIC_REFETCH_OF_THE_SAME_KEY,
      'useMutation({ mutationFn: signUpload });',
      'useMutation(buildOptions());',
      'useQuery({ queryKey: keys.list(), queryFn: fetchList });',
    ],
    invalid: [
      { code: REFETCHES_THE_WRITTEN_KEY, errors: [{ messageId: 'refetchAfterOptimisticWrite' }] },
      {
        code: REFETCHES_A_PREFIX_OF_THE_WRITTEN_KEY,
        errors: [{ messageId: 'refetchAfterOptimisticWrite' }],
      },
      { code: REFETCHES_EVERYTHING, errors: [{ messageId: 'refetchAfterOptimisticWrite' }] },
      {
        code: REFETCHES_THE_WRITTEN_KEY_IN_ON_SUCCESS,
        errors: [{ messageId: 'refetchAfterOptimisticWrite' }],
      },
      {
        code: REFETCHES_THE_WRITTEN_KEY_BEHIND_A_HELPER,
        errors: [{ messageId: 'refetchAfterOptimisticWrite' }],
      },
      {
        code: REFETCHES_THE_WRITTEN_KEY_BEHIND_A_HELPER_DECLARED_BELOW,
        errors: [{ messageId: 'refetchAfterOptimisticWrite' }],
      },
      {
        code: REFETCHES_A_KEY_FROM_A_FACTORY_DECLARED_ELSEWHERE,
        errors: [{ messageId: 'refetchAfterOptimisticWrite' }],
      },
    ],
  },
);
