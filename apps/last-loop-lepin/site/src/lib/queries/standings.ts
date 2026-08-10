/**
 * Standings reads. The spectator screen and the admin screens all watch the
 * same key, which polls every two seconds while an edition slug is known.
 *
 * Writes that change the standings live in `punches.ts`; they reconcile the
 * cache from the mutation response and let the poll carry the rest, because a
 * `GET` fired straight after a write can be served by another connection that
 * still sees the state from before the commit.
 */

import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api';

const POLL_INTERVAL_MS = 2_000;

export const standingKeys = {
  all: ['standings'] as const,
  forEdition: (editionSlug: string) => [...standingKeys.all, editionSlug] as const,
};

export function useStandings(editionSlug: string) {
  return useQuery({
    queryKey: standingKeys.forEdition(editionSlug),
    queryFn: async () => {
      const response = await api.api.standings[':editionSlug'].$get({ param: { editionSlug } });
      if (!response.ok)
        throw new ApiError(response.status, await response.json().catch(() => null));
      return response.json();
    },
    refetchInterval: POLL_INTERVAL_MS,
    enabled: editionSlug !== '',
  });
}
