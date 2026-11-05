/** @Feature auth */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import { type OpeningWait, selectOpeningWait } from './session-gate.core';

// @FollowsBlueprint hook-external-store
export function useOpeningWait(): OpeningWait {
  const queryClient = useQueryClient();
  const subscribeToQueryCache = useCallback(
    (onStoreChange: () => void) => queryClient.getQueryCache().subscribe(onStoreChange),
    [queryClient],
  );
  const readOpeningWait = useCallback(
    () => selectOpeningWait(queryClient.getQueryCache().getAll()),
    [queryClient],
  );
  return useSyncExternalStore(subscribeToQueryCache, readOpeningWait, readOpeningWait);
}
