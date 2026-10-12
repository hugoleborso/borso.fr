import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// @FollowsBlueprint utils-pure-module
export function composeClassName(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
