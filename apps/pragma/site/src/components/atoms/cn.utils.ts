/**
 * `cn` — class-name composition. Thin wrapper around `clsx` so all
 * atoms / molecules / organisms reach for the same helper. The
 * indirection is deliberate: the project's `cn` is the only public
 * way of joining class strings, which keeps the JSX consistent and
 * lets the codebase swap implementations if `clsx` ever changes
 * shape (e.g. `tailwind-merge` integration).
 */

import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
