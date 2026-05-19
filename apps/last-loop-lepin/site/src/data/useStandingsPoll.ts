import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { StandingsDto } from '../domain/types';

const POLL_INTERVAL_MS = 2_000;

export interface StandingsState {
  readonly standings: StandingsDto | null;
  readonly mostRecentCorrectionAt: string | null;
  readonly error: Error | null;
}

const INITIAL_SNAPSHOT: StandingsState = {
  standings: null,
  mostRecentCorrectionAt: null,
  error: null,
};

export function useStandings(editionSlug: string): StandingsState {
  const result = useQuery({
    queryKey: ['standings', editionSlug],
    queryFn: () => apiClient.getStandings(editionSlug),
    refetchInterval: POLL_INTERVAL_MS,
    enabled: editionSlug !== '',
  });

  if (editionSlug === '') return INITIAL_SNAPSHOT;
  if (result.data === undefined) {
    return {
      standings: null,
      mostRecentCorrectionAt: null,
      error: result.error instanceof Error ? result.error : null,
    };
  }
  const standings: StandingsDto = {
    ...result.data.standings,
    fastestLap: result.data.standings.fastestLap ?? [],
  };
  return {
    standings,
    mostRecentCorrectionAt: result.data.mostRecentCorrectionAt ?? null,
    error: null,
  };
}
