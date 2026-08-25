import { afterEach, describe, expect, it, vi } from 'vitest';

type WakeLockModule = typeof import('./scene-wake-lock.adapter');

interface FakeSentinel {
  readonly release: ReturnType<typeof vi.fn>;
}

async function freshModule(): Promise<WakeLockModule> {
  vi.resetModules();
  return await import('./scene-wake-lock.adapter');
}

function fakeSentinel(): FakeSentinel {
  return { release: vi.fn(() => Promise.resolve()) };
}

function stubWakeLock(request: () => Promise<unknown>): void {
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request },
  });
}

function removeWakeLock(): void {
  Reflect.deleteProperty(navigator, 'wakeLock');
}

function ignoreGrant(): void {
  return undefined;
}

async function settleRequests(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function watchConsole(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(console, 'warn').mockImplementation(() => undefined);
}

afterEach(() => {
  removeWakeLock();
  vi.restoreAllMocks();
});

describe('holdScreenAwakeWhileAttached', () => {
  it('asks for a screen lock when the scene attaches', async () => {
    const sentinel = fakeSentinel();
    const request = vi.fn(() => Promise.resolve(sentinel));
    stubWakeLock(request);
    const { holdScreenAwakeWhileAttached } = await freshModule();
    holdScreenAwakeWhileAttached(document.createElement('dialog'));
    await vi.waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
  });

  it('releases the lock on the detach call React makes with null', async () => {
    const sentinel = fakeSentinel();
    stubWakeLock(() => Promise.resolve(sentinel));
    const { holdScreenAwakeWhileAttached } = await freshModule();
    holdScreenAwakeWhileAttached(document.createElement('dialog'));
    await settleRequests();
    expect(sentinel.release).not.toHaveBeenCalled();
    holdScreenAwakeWhileAttached(null);
    expect(sentinel.release).toHaveBeenCalledOnce();
  });

  it('releases a lock that arrives after the scene already closed', async () => {
    const sentinel = fakeSentinel();
    let grant: (value: FakeSentinel) => void = ignoreGrant;
    stubWakeLock(
      () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    );
    const { holdScreenAwakeWhileAttached, releaseScreenLock } = await freshModule();
    holdScreenAwakeWhileAttached(document.createElement('dialog'));
    releaseScreenLock();
    grant(sentinel);
    await vi.waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce());
  });

  it('says nothing and asks for nothing in a browser without the API', async () => {
    const warn = watchConsole();
    const { holdScreenAwakeWhileAttached } = await freshModule();
    expect(() => holdScreenAwakeWhileAttached(document.createElement('dialog'))).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it('reports a refused request instead of throwing at the render', async () => {
    const warn = watchConsole();
    const refusal = new Error('denied');
    stubWakeLock(() => Promise.reject(refusal));
    const { holdScreenAwakeWhileAttached } = await freshModule();
    holdScreenAwakeWhileAttached(document.createElement('dialog'));
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith({ surface: 'scene-wake-lock', error: refusal }),
    );
  });
});

describe('releaseScreenLock', () => {
  it('does nothing when no lock is held', async () => {
    const { releaseScreenLock } = await freshModule();
    expect(() => releaseScreenLock()).not.toThrow();
  });

  it('reports a release that fails', async () => {
    const warn = watchConsole();
    const failure = new Error('already released');
    const sentinel = { release: vi.fn(() => Promise.reject(failure)) };
    stubWakeLock(() => Promise.resolve(sentinel));
    const { holdScreenAwakeWhileAttached, releaseScreenLock } = await freshModule();
    holdScreenAwakeWhileAttached(document.createElement('dialog'));
    await settleRequests();
    expect(sentinel.release).not.toHaveBeenCalled();
    releaseScreenLock();
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith({ surface: 'scene-wake-lock', error: failure }),
    );
  });
});
