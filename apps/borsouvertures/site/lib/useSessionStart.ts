import { useState } from 'react';

/**
 * Run `start` once for the lifetime of the mount.
 *
 * `useState`'s initialiser is the one place React promises to call exactly
 * once per mount, before the first paint, which is what starting a session
 * machine needs. A caller that has to restart the machine changes the `key` of
 * the component holding this hook, so React remounts it.
 *
 * @Blueprint hook-effect-free-mount
 * @BlueprintName Effect Free Mount Hook
 * @BlueprintUsage Use when work has to run exactly once per mount, in place of a `useEffect` with an empty dependency array.
 * @BlueprintDescription Runs the work inside `useState`'s lazy initialiser, which React calls once per mount and before the first paint, and discards the result by returning `null`. An empty dependency effect runs after paint and runs twice under StrictMode, so a machine started that way would be started twice and would show its initial frame first. Restarting is the caller's job through a changed `key`, which remounts the component and so calls the initialiser again.
 */
export function useSessionStart(start: () => void): void {
  useState(() => {
    start();
    return null;
  });
}
