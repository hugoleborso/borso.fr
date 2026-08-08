import { useState } from 'react';

/**
 * Run `start` once for the lifetime of the mount.
 *
 * `useState`'s initialiser is the one place React promises to call exactly
 * once per mount, before the first paint, which is what starting a session
 * machine needs. A caller that has to restart the machine changes the `key` of
 * the component holding this hook, so React remounts it.
 */
export function useSessionStart(start: () => void): void {
  useState(() => {
    start();
    return null;
  });
}
