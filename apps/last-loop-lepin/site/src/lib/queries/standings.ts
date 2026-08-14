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

// @FollowsBlueprint query-module
export const standingKeys = {
  all: ['standings'] as const,
  forEdition: (editionSlug: string) => [...standingKeys.all, editionSlug] as const,
};

/**
 * @Blueprint query-polling
 * @BlueprintName Polling Query
 * @BlueprintUsage Use for data that several screens watch and that changes without this client writing it.
 * @BlueprintDescription Carries the update through `refetchInterval` rather than through invalidation, so a write elsewhere never has to know which keys it touched. That also avoids the read after write trap on Aurora DSQL, where a `GET` fired straight after a write can be served by another connection that still sees the state from before the commit. The `enabled` flag keeps the poll off while the edition slug is unknown, so the hook can be called unconditionally.
 */
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
