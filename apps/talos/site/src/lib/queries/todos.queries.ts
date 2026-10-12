import { isTodoListShownOnToday, type TodoListName } from '@domain/todo-list.core';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful, readFailureBody } from '../api.client';
import { toIsoDay } from '../calendar-day.utils';
import {
  applyTodoPatch,
  buildPendingTodo,
  findIndexById,
  insertAt,
  removeById,
  replaceTodo,
  type TodoPatch,
} from './cache-updates.core';
import { useMutationToasts } from '../toast.hook';
import {
  selectTodoReversal,
  selectTodoUpdateToast,
  TODO_ADDED_TOAST,
  TODO_DELETED_TOAST,
  TODO_RESTORED_TOAST,
} from './mutation-toasts.core';
import { todayKeys } from './today.queries';

export const todoKeys = {
  all: ['todos'] as const,
  list: (list: TodoListName) => [...todoKeys.all, list, 'list'] as const,
};

function selectTodoEndpoint(list: TodoListName) {
  return list === 'work' ? api.api['work-todos'] : api.api.todos;
}

async function takeOverviewSnapshot(
  queryClient: QueryClient,
  list: TodoListName,
): Promise<TodayResponse | undefined> {
  if (!isTodoListShownOnToday(list)) return undefined;
  await queryClient.cancelQueries({ queryKey: todayKeys.overview() });
  return queryClient.getQueryData<TodayResponse>(todayKeys.overview());
}

function updateOverviewTodos(
  queryClient: QueryClient,
  list: TodoListName,
  transform: (todos: TodayResponse['todos']) => TodayResponse['todos'],
): void {
  if (!isTodoListShownOnToday(list)) return;
  queryClient.setQueryData<TodayResponse>(todayKeys.overview(), (old) => {
    if (old === undefined) return old;
    return { ...old, todos: transform(old.todos) };
  });
}

function rollBackOverview(queryClient: QueryClient, previous: TodayResponse | undefined): void {
  if (previous !== undefined) queryClient.setQueryData(todayKeys.overview(), previous);
}

type TodosResponse = InferResponseType<typeof api.api.todos.$get, 200>;
type TodayResponse = InferResponseType<typeof api.api.today.$get, 200>;
type TodoCreation = Parameters<typeof api.api.todos.$post>[0]['json'];
type TodoRestoration = Parameters<typeof api.api.todos.restorations.$post>[0]['json'];

// @FollowsBlueprint query-module
export function useTodos(list: TodoListName) {
  return useQuery({
    queryKey: todoKeys.list(list),
    queryFn: async () => {
      const response = await selectTodoEndpoint(list).$get();
      if (!response.ok) throw new ApiError(response.status, `todos ${response.status}`, null);
      return await response.json();
    },
  });
}

// @FollowsBlueprint query-optimistic-insert
export function useCreateTodo(list: TodoListName) {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: async (variables: TodoCreation) => {
      const response = await selectTodoEndpoint(list).$post({ json: variables });
      const { status } = response;
      if (!isResponseSuccessful(response)) {
        throw new ApiError(status, `todo ${status}`, await readFailureBody(response));
      }
      return await response.json();
    },
    onMutate: async (variables) => {
      const listKey = todoKeys.list(list);
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
      queryClient.setQueryData<TodosResponse>(todoKeys.list(list), (old) => {
        if (old === undefined) return old;
        return { items: replaceTodo(old.items, context.temporaryId, savedTodo) };
      });
    },
    onError: (failure, _variables, context) => {
      toasts.fail(failure, 'todo.error');
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(todoKeys.list(list), context.previousList);
      }
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUpdateTodo(list: TodoListName) {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const updateTodo = useMutation({
    mutationFn: async (variables: { id: string } & TodoPatch) => {
      const { id, ...patch } = variables;
      const response = await selectTodoEndpoint(list)[':id'].$patch({ param: { id }, json: patch });
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
      const listKey = todoKeys.list(list);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<TodosResponse>(listKey);
      const previousOverview = await takeOverviewSnapshot(queryClient, list);
      const { id, ...patch } = variables;
      const today = toIsoDay(new Date());
      queryClient.setQueryData<TodosResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { items: applyTodoPatch(old.items, id, patch, today) };
      });
      updateOverviewTodos(queryClient, list, (todos) => applyTodoPatch(todos, id, patch, today));
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
      queryClient.setQueryData<TodosResponse>(todoKeys.list(list), (old) => {
        if (old === undefined) return old;
        return { items: replaceTodo(old.items, variables.id, savedTodo) };
      });
      updateOverviewTodos(queryClient, list, (todos) =>
        replaceTodo(todos, variables.id, savedTodo),
      );
    },
    onError: (failure, _variables, context) => {
      toasts.fail(failure, 'todo.error');
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(todoKeys.list(list), context.previousList);
      }
      rollBackOverview(queryClient, context?.previousOverview);
    },
  });
  return updateTodo;
}

export function useRestoreTodo(list: TodoListName) {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  return useMutation({
    mutationFn: async (variables: TodoRestoration & { readonly overviewIndex: number | null }) => {
      const response = await selectTodoEndpoint(list).restorations.$post({
        json: { line: variables.line, position: variables.position },
      });
      const { status } = response;
      if (!isResponseSuccessful(response)) {
        throw new ApiError(status, `todo ${status}`, await readFailureBody(response));
      }
      return await response.json();
    },
    onSuccess: (restoredTodo, variables) => {
      toasts.confirm(TODO_RESTORED_TOAST);
      queryClient.setQueryData<TodosResponse>(todoKeys.list(list), (old) => {
        if (old === undefined) return old;
        return { items: insertAt(old.items, variables.position, restoredTodo) };
      });
      const { overviewIndex } = variables;
      if (overviewIndex === null) return;
      updateOverviewTodos(queryClient, list, (todos) =>
        insertAt(todos, overviewIndex, restoredTodo),
      );
    },
    onError: (failure) => {
      toasts.fail(failure, 'todo.error');
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteTodo(list: TodoListName) {
  const queryClient = useQueryClient();
  const toasts = useMutationToasts();
  const restoreTodo = useRestoreTodo(list);
  return useMutation({
    mutationFn: async (variables: { readonly id: string }) => {
      const response = await selectTodoEndpoint(list)[':id'].$delete({
        param: { id: variables.id },
      });
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
      const listKey = todoKeys.list(list);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<TodosResponse>(listKey);
      const previousOverview = await takeOverviewSnapshot(queryClient, list);
      const overviewIndex = findIndexById(previousOverview?.todos ?? [], variables.id);
      queryClient.setQueryData<TodosResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { items: removeById(old.items, variables.id) };
      });
      updateOverviewTodos(queryClient, list, (todos) => removeById(todos, variables.id));
      return { previousList, previousOverview, overviewIndex };
    },
    onSuccess: (removal, _variables, context) => {
      toasts.confirm(TODO_DELETED_TOAST, {
        labelKey: 'toast.undo',
        onAction: () => {
          restoreTodo.mutate({
            line: removal.line,
            position: removal.position,
            overviewIndex: context.overviewIndex,
          });
        },
      });
    },
    onError: (failure, _variables, context) => {
      toasts.fail(failure, 'todo.error');
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(todoKeys.list(list), context.previousList);
      }
      rollBackOverview(queryClient, context?.previousOverview);
    },
  });
}
