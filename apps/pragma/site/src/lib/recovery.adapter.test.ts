import { afterEach, describe, expect, it, vi } from 'vitest';
import { discardCachesAndReload, reload } from './recovery.adapter';

function stubLocationReload(): ReturnType<typeof vi.fn> {
  const reloadSpy = vi.fn();
  vi.stubGlobal('location', { reload: reloadSpy });
  return reloadSpy;
}

describe('recovery.adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('reload', () => {
    it('reloads the document', () => {
      const reloadSpy = stubLocationReload();
      reload();
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('discardCachesAndReload', () => {
    it('deletes every cache and unregisters every worker before reloading', async () => {
      const reloadSpy = stubLocationReload();
      const deleteCache = vi.fn().mockResolvedValue(true);
      vi.stubGlobal('caches', {
        keys: vi.fn().mockResolvedValue(['pragma-v3-shell', 'pragma-v3-data']),
        delete: deleteCache,
      });
      const firstUnregister = vi.fn().mockResolvedValue(true);
      const secondUnregister = vi.fn().mockResolvedValue(true);
      vi.stubGlobal('navigator', {
        serviceWorker: {
          getRegistrations: vi
            .fn()
            .mockResolvedValue([{ unregister: firstUnregister }, { unregister: secondUnregister }]),
        },
      });

      await discardCachesAndReload();

      expect(deleteCache.mock.calls).toEqual([['pragma-v3-shell'], ['pragma-v3-data']]);
      expect(firstUnregister).toHaveBeenCalledTimes(1);
      expect(secondUnregister).toHaveBeenCalledTimes(1);
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('still unregisters the worker when the caches cannot be dropped', async () => {
      const reloadSpy = stubLocationReload();
      vi.stubGlobal('caches', {
        keys: vi.fn().mockRejectedValue(new Error('storage is unavailable')),
        delete: vi.fn(),
      });
      const unregister = vi.fn().mockResolvedValue(true);
      vi.stubGlobal('navigator', {
        serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }]) },
      });

      await discardCachesAndReload();

      expect(unregister).toHaveBeenCalledTimes(1);
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('reloads on a browser exposing neither lever, rather than rejecting', async () => {
      const reloadSpy = stubLocationReload();
      vi.stubGlobal('navigator', {});

      await discardCachesAndReload();

      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });
  });
});
