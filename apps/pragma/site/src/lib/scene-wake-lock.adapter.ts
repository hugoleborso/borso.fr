/** @Feature songs */

const SCREEN_LOCK: WakeLockType = 'screen';
const SURFACE = 'scene-wake-lock';

interface ReleasableLock {
  readonly release: () => Promise<void>;
}

interface ScreenLockHolder {
  readonly holdWhileAttached: (element: HTMLElement | null) => void;
  readonly release: () => void;
}

function report(error: unknown): void {
  console.warn({ surface: SURFACE, error });
}

function releaseLock(lock: ReleasableLock): void {
  lock.release().catch(report);
}

function createScreenLockHolder(): ScreenLockHolder {
  let held: ReleasableLock | null = null;
  let holdingFor: HTMLElement | null = null;

  const release = (): void => {
    holdingFor = null;
    if (held === null) return;
    releaseLock(held);
    held = null;
  };

  return {
    holdWhileAttached: (element) => {
      if (element === null) {
        release();
        return;
      }
      if (!('wakeLock' in navigator)) return;
      holdingFor = element;
      navigator.wakeLock
        .request(SCREEN_LOCK)
        .then((sentinel) => {
          if (holdingFor === null) {
            releaseLock(sentinel);
            return;
          }
          held = sentinel;
        })
        .catch(report);
    },
    release,
  };
}

const screenLock = createScreenLockHolder();

/** @DependsOnExternal browser-wake-lock */
// @FollowsBlueprint ref-callback-browser-api
export const holdScreenAwakeWhileAttached = screenLock.holdWhileAttached;

export const releaseScreenLock = screenLock.release;
