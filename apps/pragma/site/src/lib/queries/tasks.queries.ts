/** @Feature tasks */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import { replaceEntityById, settleTemporaryEntity } from './optimistic.utils';

export const taskKeys = {
  all: ['tasks'] as const,
  list: () => [...taskKeys.all, 'list'] as const,
};

type TasksListResponse = InferResponseType<typeof api.api.tasks.$get>;
export type TaskRow = TasksListResponse['tasks'][number];
type TaskCreateVariables = Parameters<typeof api.api.tasks.$post>[0]['json'];
type TaskUpdateVariables = { id: string } & Parameters<
  (typeof api.api.tasks)[':id']['$put']
>[0]['json'];

const NEW_TASK_DEFAULTS: Pick<TaskRow, 'notes' | 'status' | 'assigneeId' | 'songId' | 'dueDate'> = {
  notes: '',
  status: 'todo',
  assigneeId: null,
  songId: null,
  dueDate: null,
};

function buildOptimisticTask(id: string, input: TaskCreateVariables): TaskRow {
  return { ...NEW_TASK_DEFAULTS, ...input, id };
}

// @FollowsBlueprint query-module
export function useTasksList() {
  return useQuery({
    queryKey: taskKeys.list(),
    queryFn: async () => {
      const response = await api.api.tasks.$get();
      if (!response.ok) throw new ApiError(response.status, `tasks ${response.status}`, null);
      return response.json();
    },
  });
}

// @FollowsBlueprint query-optimistic-insert
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: taskKeys.all,
    mutationFn: async (variables: TaskCreateVariables) => {
      const response = await api.api.tasks.$post({ json: variables });
      if (!isResponseSuccessful(response))
        throw new ApiError(response.status, `create ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = taskKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<TasksListResponse>(listKey);
      const temporaryId = crypto.randomUUID();
      queryClient.setQueryData<TasksListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { tasks: [...old.tasks, buildOptimisticTask(temporaryId, variables)] };
      });
      return { previousList, temporaryId };
    },
    onSuccess: (data, _vars, context) => {
      queryClient.setQueryData<TasksListResponse>(taskKeys.list(), (old) => {
        if (old === undefined) return old;
        return { tasks: settleTemporaryEntity(old.tasks, context.temporaryId, data.task) };
      });
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(taskKeys.list(), context.previousList);
      }
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: taskKeys.all,
    mutationFn: async (variables: TaskUpdateVariables) => {
      const { id, ...rest } = variables;
      const response = await api.api.tasks[':id'].$put({ param: { id }, json: rest });
      if (!response.ok) throw new ApiError(response.status, `update ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = taskKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<TasksListResponse>(listKey);
      const { id, ...patch } = variables;
      queryClient.setQueryData<TasksListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { tasks: replaceEntityById(old.tasks, id, (task) => ({ ...task, ...patch })) };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(taskKeys.list(), context.previousList);
      }
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: taskKeys.all,
    mutationFn: async (variables: { id: string }) => {
      const response = await api.api.tasks[':id'].$delete({ param: { id: variables.id } });
      if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
      return response.json();
    },
    onMutate: async (variables) => {
      const listKey = taskKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<TasksListResponse>(listKey);
      queryClient.setQueryData<TasksListResponse>(listKey, (old) => {
        if (old === undefined) return old;
        return { tasks: old.tasks.filter((task) => task.id !== variables.id) };
      });
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(taskKeys.list(), context.previousList);
      }
    },
  });
}
