import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';

// @FollowsBlueprint utils-pure-module
export function composeClassName(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
