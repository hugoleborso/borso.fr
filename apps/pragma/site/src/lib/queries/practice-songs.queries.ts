/** @Feature sessions */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PracticeSongsSavePlan } from '../../routes/sessions/practice-songs.core';
import { ApiError, api, isResponseSuccessful } from '../api.client';
import { setlistKeys } from './setlists.queries';

export interface SavePracticeSongsVariables {
  readonly practiceId: string;
  readonly setlistName: string;
  readonly plan: PracticeSongsSavePlan;
}

async function createPracticeSetlist(practiceId: string, name: string): Promise<string> {
  const response = await api.api.setlists.$post({ json: { name, sessionId: practiceId } });
  if (!isResponseSuccessful(response))
    throw new ApiError(response.status, `create ${response.status}`, null);
  const created = await response.json();
  return created.setlist.id;
}

async function appendSongs(setlistId: string, songIds: readonly string[]): Promise<void> {
  if (songIds.length === 0) return;
  const response = await api.api.setlists[':id'].entries.batch.$post({
    param: { id: setlistId },
    json: { songIds: [...songIds] },
  });
  if (!isResponseSuccessful(response))
    throw new ApiError(response.status, `add ${response.status}`, null);
}

async function removeEntry(setlistId: string, entryId: string): Promise<void> {
  const response = await api.api.setlists[':id'].entries[':entryId'].$delete({
    param: { id: setlistId, entryId },
  });
  if (!response.ok) throw new ApiError(response.status, `delete ${response.status}`, null);
}

async function unlinkSetlist(setlistId: string, practiceId: string): Promise<void> {
  const response = await api.api.setlists[':id'].sessions[':sessionId'].$delete({
    param: { id: setlistId, sessionId: practiceId },
  });
  if (!response.ok) throw new ApiError(response.status, `unlink ${response.status}`, null);
}

async function resolveOwnSetlistId(variables: SavePracticeSongsVariables): Promise<string | null> {
  if (variables.plan.ownSetlistId !== null) return variables.plan.ownSetlistId;
  if (variables.plan.addSongIds.length === 0) return null;
  return await createPracticeSetlist(variables.practiceId, variables.setlistName);
}

async function applyPracticeSongsPlan(variables: SavePracticeSongsVariables): Promise<void> {
  const { plan, practiceId } = variables;
  const ownSetlistId = await resolveOwnSetlistId(variables);
  if (ownSetlistId !== null) await appendSongs(ownSetlistId, plan.addSongIds);
  for (const removed of plan.removedEntries) {
    await removeEntry(removed.setlistId, removed.entryId);
  }
  for (const setlistId of plan.unlinkedSetlistIds) {
    await unlinkSetlist(setlistId, practiceId);
  }
}

// @FollowsBlueprint query-pessimistic-mutation
export function useSavePracticeSongs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applyPracticeSongsPlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: setlistKeys.all });
    },
  });
}
