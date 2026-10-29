import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

export const TEXT_ROLES = [
  'display',
  'heading',
  'title',
  'body',
  'meta',
  'label',
  'stage-hero',
  'stage-title',
  'stage-body',
  'stage-meta',
] as const;
export const RADIUS_TOKENS = ['cover', 'sm', 'md', 'lg', 'sheet', 'pill'] as const;
export const SHADOW_TOKENS = ['leaf', 'raised', 'overlay', 'cover'] as const;

const mergeTokenClassNames = extendTailwindMerge({
  extend: {
    theme: {
      text: [...TEXT_ROLES],
      radius: [...RADIUS_TOKENS],
      shadow: [...SHADOW_TOKENS],
    },
  },
});

// @FollowsBlueprint utils-pure-module
export function composeClassName(...inputs: ClassValue[]): string {
  return mergeTokenClassNames(clsx(inputs));
}
