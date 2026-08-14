/**
 * `composeClassName` — class-name composition. Thin wrapper around
 * `clsx` so all atoms / molecules / organisms reach for the same
 * helper. The indirection is deliberate: the project's
 * `composeClassName` is the only public way of joining class strings,
 * which keeps the JSX consistent and lets the codebase swap
 * implementations if `clsx` ever changes shape (e.g. `tailwind-merge`
 * integration).
 */

import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';

// @FollowsBlueprint utils-pure-module
export function composeClassName(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
