import { useState } from 'react';

/**
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
