import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api.client';

export const historyKeys = {
  all: ['history'] as const,
  index: () => [...historyKeys.all, 'index'] as const,
  brief: (date: string) => [...historyKeys.all, 'brief', date] as const,
  review: (week: string) => [...historyKeys.all, 'review', week] as const,
};

// @FollowsBlueprint query-module
export function useHistory() {
  return useQuery({
    queryKey: historyKeys.index(),
    queryFn: async () => {
      const response = await api.api.history.$get();
      if (!response.ok) throw new ApiError(response.status, `history ${response.status}`, null);
      return await response.json();
    },
  });
}

export function usePastBrief(date: string) {
  return useQuery({
    queryKey: historyKeys.brief(date),
    queryFn: async () => {
      const response = await api.api.history.briefs[':date'].$get({ param: { date } });
      if (!response.ok) throw new ApiError(response.status, `brief ${response.status}`, null);
      return await response.json();
    },
  });
}

export function useWeeklyReview(week: string) {
  return useQuery({
    queryKey: historyKeys.review(week),
    queryFn: async () => {
      const response = await api.api.history.reviews[':week'].$get({ param: { week } });
      if (!response.ok) throw new ApiError(response.status, `review ${response.status}`, null);
      return await response.json();
    },
  });
}
