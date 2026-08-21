import rule from './no-refetch-of-optimistically-written-query.js';
import { createRuleTester } from './rule-tester.js';

const OPTIMISTIC_WITHOUT_REFETCH = `
  useMutation({
    mutationFn: remove,
    onMutate: (variables) => {
      const previous = queryClient.getQueryData(keys.list());
      queryClient.setQueryData(keys.list(), drop(previous, variables.id));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(keys.list(), context.previous);
    },
  });
`;

const PESSIMISTIC_WITH_REFETCH = `
  useMutation({
    mutationFn: create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });
`;

const OPTIMISTIC_WITH_SETTLED_REFETCH = `
  useMutation({
    mutationFn: remove,
    onMutate: () => ({ previous: queryClient.getQueryData(keys.list()) }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });
`;

const OPTIMISTIC_WITH_SUCCESS_REFETCH = `
  useMutation({
    mutationFn: update,
    onMutate: () => ({ previous: queryClient.getQueryData(keys.list()) }),
    onSuccess: () => {
      void queryClient.refetchQueries({ queryKey: keys.list() });
    },
  });
`;

const OPTIMISTIC_WITH_REFETCH_BEHIND_A_HELPER = `
  function refetchProjectionsTheClientCannotPredict(queryClient) {
    void queryClient.invalidateQueries({ queryKey: keys.all });
  }
  useMutation({
    mutationFn: remove,
    onMutate: () => ({ previous: queryClient.getQueryData(keys.list()) }),
    onSettled: () => {
      refetchProjectionsTheClientCannotPredict(queryClient);
    },
  });
`;

const OPTIMISTIC_WITH_REFETCH_BEHIND_A_HELPER_DECLARED_BELOW = `
  useMutation({
    mutationFn: remove,
    onMutate: () => ({ previous: queryClient.getQueryData(keys.list()) }),
    onSettled: () => {
      refetchLater(queryClient);
    },
  });
  const refetchLater = (queryClient) => {
    void queryClient.invalidateQueries({ queryKey: keys.all });
  };
`;

// @FollowsBlueprint test-lint-rule
createRuleTester('apps/pragma/site/src/lib/queries/instruments.queries.ts', { jsx: false }).run(
  'no-refetch-of-optimistically-written-query',
  rule,
  {
    valid: [
      OPTIMISTIC_WITHOUT_REFETCH,
      PESSIMISTIC_WITH_REFETCH,
      'useMutation({ mutationFn: signUpload });',
      'useMutation(buildOptions());',
      'useQuery({ queryKey: keys.list(), queryFn: fetchList });',
    ],
    invalid: [
      {
        code: OPTIMISTIC_WITH_SETTLED_REFETCH,
        errors: [{ messageId: 'refetchAfterOptimisticWrite' }],
      },
      {
        code: OPTIMISTIC_WITH_SUCCESS_REFETCH,
        errors: [{ messageId: 'refetchAfterOptimisticWrite' }],
      },
      {
        code: OPTIMISTIC_WITH_REFETCH_BEHIND_A_HELPER,
        errors: [{ messageId: 'refetchAfterOptimisticWrite' }],
      },
      {
        code: OPTIMISTIC_WITH_REFETCH_BEHIND_A_HELPER_DECLARED_BELOW,
        errors: [{ messageId: 'refetchAfterOptimisticWrite' }],
      },
    ],
  },
);
