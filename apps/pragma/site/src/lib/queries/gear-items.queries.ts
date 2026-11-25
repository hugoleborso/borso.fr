/** @Feature sessions */

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { ApiError, api, isResponseSuccessful, readErrorBody } from '../api.client';
import { writeKeepingStaleness } from './cache-write.queries';
import { replaceEntityById, settleTemporaryEntity } from './optimistic.utils';

const GEAR_ITEMS_WRITE_SCOPE = { id: 'gear-items-writes' } as const;

export const gearItemKeys = {
  all: ['gear-items'] as const,
  checklist: (sessionId: string) => [...gearItemKeys.all, 'checklist', sessionId] as const,
};

type GearChecklistResponse = InferResponseType<
  (typeof api.api)['gear-items'][':sessionId']['$get'],
  200
>;
export type GearItemRecord = GearChecklistResponse['items'][number];

export interface GearItemCreation {
  readonly sessionId: string;
  readonly id: string;
  readonly label: string;
  readonly status: GearItemRecord['status'];
  readonly memberId: string | null;
}

export type GearItemChange = { readonly sessionId: string; readonly id: string } & Partial<
  Pick<GearItemRecord, 'label' | 'status' | 'memberId'>
>;

interface ChecklistSnapshot {
  readonly sessionId: string;
  readonly previous: GearChecklistResponse | undefined;
}

async function throwUnlessSuccessful(
  response: { readonly ok: boolean; readonly status: number; json: () => Promise<unknown> },
  label: string,
): Promise<void> {
  if (isResponseSuccessful(response)) return;
  throw new ApiError(
    response.status,
    `${label} ${String(response.status)}`,
    await readErrorBody(response),
  );
}

function settleChecklist(
  queryClient: QueryClient,
  sessionId: string,
  rewrite: (items: readonly GearItemRecord[]) => GearItemRecord[],
): void {
  writeKeepingStaleness<GearChecklistResponse>(
    queryClient,
    gearItemKeys.checklist(sessionId),
    (old) => (old === undefined ? old : { ...old, items: rewrite(old.items) }),
  );
}

async function writeChecklist(
  queryClient: QueryClient,
  sessionId: string,
  rewrite: (items: readonly GearItemRecord[]) => GearItemRecord[],
): Promise<ChecklistSnapshot> {
  const key = gearItemKeys.checklist(sessionId);
  await queryClient.cancelQueries({ queryKey: key });
  const previous = queryClient.getQueryData<GearChecklistResponse>(key);
  settleChecklist(queryClient, sessionId, rewrite);
  return { sessionId, previous };
}

function restoreChecklist(queryClient: QueryClient, snapshot: ChecklistSnapshot | undefined): void {
  if (snapshot?.previous === undefined) return;
  writeKeepingStaleness(queryClient, gearItemKeys.checklist(snapshot.sessionId), snapshot.previous);
}

function nextPosition(items: readonly GearItemRecord[]): number {
  return items.reduce((highest, item) => Math.max(highest, item.position + 1), 0);
}

// @FollowsBlueprint query-module
export function useGearChecklist(sessionId: string, isEnabled = true) {
  return useQuery({
    queryKey: gearItemKeys.checklist(sessionId),
    enabled: isEnabled,
    queryFn: async () => {
      const response = await api.api['gear-items'][':sessionId'].$get({ param: { sessionId } });
      if (!response.ok) {
        throw new ApiError(response.status, `gear ${String(response.status)}`, null);
      }
      return response.json();
    },
  });
}

// @FollowsBlueprint query-optimistic-insert
export function useCreateGearItem() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: GEAR_ITEMS_WRITE_SCOPE,
    mutationKey: gearItemKeys.all,
    mutationFn: async ({ sessionId, ...item }: GearItemCreation) => {
      const response = await api.api['gear-items'][':sessionId'].$post({
        param: { sessionId },
        json: item,
      });
      await throwUnlessSuccessful(response, 'create gear item');
      return response.json();
    },
    onMutate: async ({ sessionId, ...item }) =>
      await writeChecklist(queryClient, sessionId, (items) => [
        ...items.filter((listed) => listed.id !== item.id),
        { ...item, sessionId, position: nextPosition(items) },
      ]),
    onSuccess: (data, variables) => {
      if (!('item' in data)) return;
      settleChecklist(queryClient, variables.sessionId, (items) =>
        settleTemporaryEntity(items, variables.id, data.item),
      );
    },
    onError: (_error, _variables, context) => {
      restoreChecklist(queryClient, context);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useUpdateGearItem() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: GEAR_ITEMS_WRITE_SCOPE,
    mutationKey: gearItemKeys.all,
    mutationFn: async ({ sessionId, id, ...change }: GearItemChange) => {
      const response = await api.api['gear-items'][':sessionId'][':id'].$put({
        param: { sessionId, id },
        json: change,
      });
      await throwUnlessSuccessful(response, 'update gear item');
      return response.json();
    },
    onMutate: async ({ sessionId, id, ...change }) =>
      await writeChecklist(queryClient, sessionId, (items) =>
        replaceEntityById(items, id, (item) => ({ ...item, ...change })),
      ),
    onSuccess: (data, variables) => {
      if (!('item' in data)) return;
      settleChecklist(queryClient, variables.sessionId, (items) =>
        replaceEntityById(items, variables.id, () => data.item),
      );
    },
    onError: (_error, _variables, context) => {
      restoreChecklist(queryClient, context);
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useDeleteGearItem() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: GEAR_ITEMS_WRITE_SCOPE,
    mutationKey: gearItemKeys.all,
    mutationFn: async ({ sessionId, id }: { readonly sessionId: string; readonly id: string }) => {
      const response = await api.api['gear-items'][':sessionId'][':id'].$delete({
        param: { sessionId, id },
      });
      await throwUnlessSuccessful(response, 'delete gear item');
      return response.json();
    },
    onMutate: async ({ sessionId, id }) =>
      await writeChecklist(queryClient, sessionId, (items) =>
        items.filter((item) => item.id !== id),
      ),
    onError: (_error, _variables, context) => {
      restoreChecklist(queryClient, context);
    },
  });
}

export function useCopyGearItems() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: GEAR_ITEMS_WRITE_SCOPE,
    mutationKey: gearItemKeys.all,
    mutationFn: async ({
      sessionId,
      fromSessionId,
    }: {
      readonly sessionId: string;
      readonly fromSessionId: string;
    }) => {
      const response = await api.api['gear-items'][':sessionId'].copy.$post({
        param: { sessionId },
        json: { fromSessionId },
      });
      await throwUnlessSuccessful(response, 'copy gear items');
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (!('items' in data)) return;
      settleChecklist(queryClient, variables.sessionId, () => data.items);
    },
  });
}
