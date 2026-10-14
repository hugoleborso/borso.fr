import { MutationObserver, QueryObserver } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from './query-client.setup';

const READ_KEY = ['another-screen', 'read'] as const;

async function mountRead() {
  const read = vi.fn().mockResolvedValue('server state');
  const observer = new QueryObserver(queryClient, { queryKey: READ_KEY, queryFn: read });
  const unsubscribe = observer.subscribe(() => undefined);
  await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  return { read, unsubscribe };
}

describe('queryClient', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('refetches a mounted read of another screen after a mutation the server alone confirms', async () => {
    const { read, unsubscribe } = await mountRead();
    await new MutationObserver(queryClient, {
      mutationFn: () => Promise.resolve('written'),
    }).mutate();
    expect(read).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('does not refetch after a mutation that wrote the cache optimistically', async () => {
    const { read, unsubscribe } = await mountRead();
    await new MutationObserver(queryClient, {
      mutationFn: () => Promise.resolve('written'),
      onMutate: () => undefined,
    }).mutate();
    expect(read).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
