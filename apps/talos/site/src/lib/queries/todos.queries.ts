import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful, readFailureBody } from '../api.client';
import { toIsoDay } from '../calendar-day.utils';
import {
  applyTodoPatch,
  buildPendingTodo,
  replaceTodo,
  type TodoPatch,
} from './cache-updates.core';
import { useMutationToasts } from '../toast.hook';
import {
  selectTodoReversal,
  selectTodoUpdateToast,
  TODO_ADDED_TOAST,
} from './mutation-toasts.core';
import { todayKeys } from './today.queries';

export const todoKeys = {
  all: ['todos'] as const,
  list: () => [...todoKeys.all, 'list'] as const,
};

type TodosResponse = InferResponseType<typeof api.api.todos.$get, 200>;
type TodayResponse = InferResponseType<typeof api.api.today.$get, 200>;
type TodoCreation = Parameters<typeof api.api.todos.$post>[0]['json'];

// @FollowsBlueprint query-module
export function useTodos() {
  return useQuery({
    queryKey: todoKeys.list(),
    queryFn: async () => {
      const response = await api.api.todos.$get();
      if (!response.ok) throw new ApiError(response.status, `todos ${response.status}`, null);
      return await response.json();
    },
  });
}

// @FollowsBlueprint query-optimistic-insert
export function useCreateTodo() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: async (variables: TodoCreation) => {
      const response = await api.api.todos.$post({ json: variables });
      const { status } = response;
      if (!isResponseSuccessful(response)) {
        throw new ApiError(status, `todo ${status}`, await readFailureBody(response));
      }
      return await response.json();
    },
    onMutate: async (variables) => {
      const listKey = todoKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<TodosResponse>(listKey);
      const temporaryId = crypto.randomUUID();
      const pendingTodo = buildPendingTodo(
        temporaryId,
        variables.text,
        variables.dueDate,
        toIsoDay(new Date()),
      );
      queryClient.setQueryData<TodosResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { items: [...old.items, pendingTodo] };
      });
      return { previousList, temporaryId };
    },
    onSuccess: (savedTodo, _variables, context) => {
      toasts.confirm(TODO_ADDED_TOAST);
      queryClient.setQueryData<TodosResponse>(todoKeys.list(), (old) => {
        if (old === undefined) return old;
        return { items: replaceTodo(old.items, context.temporaryId, savedTodo) };
      });
    },
    onError: (failure, _variables, context) => {
      toasts.fail(failure, 'todo.error');
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(todoKeys.list(), context.previousList);
      }
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUpdateTodo() {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const updateTodo = useMutation({
    mutationFn: async (variables: { id: string } & TodoPatch) => {
      const { id, ...patch } = variables;
      const response = await api.api.todos[':id'].$patch({ param: { id }, json: patch });
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `todo ${response.status}`,
          await readFailureBody(response),
        );
      }
      return await response.json();
    },
    onMutate: async (variables) => {
      const listKey = todoKeys.list();
      const overviewKey = todayKeys.overview();
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: overviewKey });
      const previousList = queryClient.getQueryData<TodosResponse>(listKey);
      const previousOverview = queryClient.getQueryData<TodayResponse>(overviewKey);
      const { id, ...patch } = variables;
      const today = toIsoDay(new Date());
      queryClient.setQueryData<TodosResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { items: applyTodoPatch(old.items, id, patch, today) };
      });
      queryClient.setQueryData<TodayResponse>(overviewKey, (old) => {
        if (old === undefined) return old;
        return { ...old, todos: applyTodoPatch(old.todos, id, patch, today) };
      });
      return { previousList, previousOverview };
    },
    onSuccess: (savedTodo, variables) => {
      const reversal = selectTodoReversal(variables);
      toasts.confirm(
        selectTodoUpdateToast(variables),
        reversal === null
          ? undefined
          : { labelKey: 'toast.undo', onAction: () => updateTodo.mutate(reversal) },
      );
      queryClient.setQueryData<TodosResponse>(todoKeys.list(), (old) => {
        if (old === undefined) return old;
        return { items: replaceTodo(old.items, variables.id, savedTodo) };
      });
      queryClient.setQueryData<TodayResponse>(todayKeys.overview(), (old) => {
        if (old === undefined) return old;
        return { ...old, todos: replaceTodo(old.todos, variables.id, savedTodo) };
      });
    },
    onError: (failure, _variables, context) => {
      toasts.fail(failure, 'todo.error');
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(todoKeys.list(), context.previousList);
      }
      if (context?.previousOverview !== undefined) {
        queryClient.setQueryData(todayKeys.overview(), context.previousOverview);
      }
    },
  });
  return updateTodo;
}
