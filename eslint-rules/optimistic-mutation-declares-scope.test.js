import rule from './optimistic-mutation-declares-scope.js';
import { createRuleTester } from './rule-tester.js';

const SCOPED_OPTIMISTIC_MUTATION = `
  useMutation({
    mutationFn: reorder,
    scope: ENTRY_WRITE_SCOPE,
    onMutate: () => {
      queryClient.setQueryData(keys.entries(), (old) => reorderByIds(old));
    },
  });`;

const UNSCOPED_OPTIMISTIC_MUTATION = `
  useMutation({
    mutationFn: reorder,
    onMutate: () => {
      queryClient.setQueryData(keys.entries(), (old) => reorderByIds(old));
    },
  });`;

const UNSCOPED_OPTIMISTIC_MUTATION_THROUGH_A_NAMESPACE = `
  ReactQuery.useMutation({
    mutationFn: reorder,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: keys.entries() });
    },
  });`;

// @FollowsBlueprint test-lint-rule
createRuleTester('apps/pragma/site/src/lib/queries/setlist-entries.queries.ts', {
  jsx: false,
}).run('optimistic-mutation-declares-scope', rule, {
  valid: [
    SCOPED_OPTIMISTIC_MUTATION,
    'useMutation({ mutationFn: create, onSuccess: settle });',
    'useMutation(buildOptions());',
    'useMutation();',
    'useQuery({ queryKey: keys.list(), queryFn: fetchList });',
    'fetchAll();',
    'client.fetchAll();',
  ],
  invalid: [
    {
      code: UNSCOPED_OPTIMISTIC_MUTATION,
      errors: [{ messageId: 'optimisticMutationWithoutScope' }],
    },
    {
      code: UNSCOPED_OPTIMISTIC_MUTATION_THROUGH_A_NAMESPACE,
      errors: [{ messageId: 'optimisticMutationWithoutScope' }],
    },
  ],
});
