import { useQuery } from '@tanstack/react-query';

export interface ResourceState<T> {
  readonly value: T | null;
  readonly error: Error | null;
}

export function useResource<T>(key: string, thunk: () => Promise<T>): ResourceState<T> {
  const result = useQuery({
    queryKey: [key],
    queryFn: thunk,
  });
  return {
    value: result.data === undefined ? null : result.data,
    error: result.error instanceof Error ? result.error : null,
  };
}

export function invalidateResource(_key: string): void {
  console.warn(
    'invalidateResource is a legacy stub ; use queryClient.invalidateQueries with the same key instead',
  );
}
