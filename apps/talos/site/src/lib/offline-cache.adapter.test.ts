import { afterEach, describe, expect, it, vi } from 'vitest';
import { type CacheStorageLike, clearOfflineData } from './offline-cache.adapter';

function buildStorage(cacheNames: string[]) {
  const deleteCache = vi.fn(
    async (cacheName: string) => await Promise.resolve(cacheName.length > 0),
  );
  const storage: CacheStorageLike = {
    keys: () => Promise.resolve(cacheNames),
    delete: deleteCache,
  };
  return { storage, deleteCache };
}

describe('clearOfflineData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('drops the cached API answers and keeps the application shell', async () => {
    const { storage, deleteCache } = buildStorage([
      'talos-v1-shell',
      'talos-v1-data',
      'talos-v1-fonts',
    ]);
    await clearOfflineData(storage);
    expect(deleteCache.mock.calls).toEqual([['talos-v1-data']]);
  });

  it('does nothing where the browser has no cache storage', async () => {
    await expect(clearOfflineData(null)).resolves.toBeUndefined();
  });

  it('reads the browser cache storage by default', async () => {
    const { storage, deleteCache } = buildStorage(['talos-v1-data']);
    vi.stubGlobal('caches', storage);
    await clearOfflineData();
    expect(deleteCache).toHaveBeenCalledWith('talos-v1-data');
  });

  it('finds no cache storage when the browser has none', async () => {
    vi.stubGlobal('caches', undefined);
    await expect(clearOfflineData()).resolves.toBeUndefined();
  });
});
