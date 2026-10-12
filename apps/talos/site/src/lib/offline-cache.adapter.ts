/** @DependsOnExternal browser-cache-storage */

export interface CacheStorageLike {
  readonly keys: () => Promise<string[]>;
  readonly delete: (cacheName: string) => Promise<boolean>;
}

const DATA_CACHE_SUFFIX = '-data';

function readBrowserCacheStorage(): CacheStorageLike | null {
  return typeof caches === 'undefined' ? null : caches;
}

// @FollowsBlueprint injected-browser-api
export async function clearOfflineData(
  storage: CacheStorageLike | null = readBrowserCacheStorage(),
): Promise<void> {
  if (storage === null) return;
  const cacheNames = await storage.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.endsWith(DATA_CACHE_SUFFIX))
      .map(async (cacheName) => await storage.delete(cacheName)),
  );
}
