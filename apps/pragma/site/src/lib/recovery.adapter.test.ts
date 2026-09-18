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
        keys: vi.fn().mockResolvedValue(['pragma-v3-shell', 'pragma-v4-data']),
        delete: deleteCache,
      });
      const unregister = vi.fn().mockResolvedValue(true);
      vi.stubGlobal('navigator', {
        serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }]) },
      });

      await discardCachesAndReload();

      expect(deleteCache).toHaveBeenCalledWith('pragma-v3-shell');
      expect(deleteCache).toHaveBeenCalledWith('pragma-v4-data');
      expect(unregister).toHaveBeenCalledTimes(1);
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('still reloads where the browser exposes neither lever', async () => {
      const reloadSpy = stubLocationReload();
      vi.stubGlobal('navigator', {});

      await discardCachesAndReload();

      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('reloads rather than rejecting when dropping a cache is refused', async () => {
      const reloadSpy = stubLocationReload();
      vi.stubGlobal('caches', {
        keys: vi.fn().mockRejectedValue(new Error('storage is unavailable')),
        delete: vi.fn(),
      });
      vi.stubGlobal('navigator', {});

      await discardCachesAndReload();

      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });
  });
});
