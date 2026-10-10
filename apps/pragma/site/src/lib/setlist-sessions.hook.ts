/** @Feature setlists */

import { useMemo } from 'react';
import { useSessionsList } from './queries/sessions.queries';
import { useSetlistsList } from './queries/setlists.queries';
import { buildSetlistIndexRows, type IndexSession } from './setlist-index.core';

const NO_ROWS: readonly never[] = [];

export function useSetlistSessions(setlistId: string): readonly IndexSession[] {
  const setlistsQuery = useSetlistsList();
  const sessionsQuery = useSessionsList();
  return useMemo(() => {
    const row = buildSetlistIndexRows<IndexSession>(
      setlistsQuery.data?.setlists ?? NO_ROWS,
      sessionsQuery.data?.sessions ?? NO_ROWS,
    ).find((candidate) => candidate.id === setlistId);
    return row?.sessions ?? NO_ROWS;
  }, [setlistsQuery.data, sessionsQuery.data, setlistId]);
}
