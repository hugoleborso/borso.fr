import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const FONT_SIZE_TOKENS = [
  'display',
  'focus',
  'prose-heading',
  'heading',
  'body',
  'body-sm',
  'label',
  'caption',
  'mono',
  'mono-sm',
];

const mergeClassNames = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: FONT_SIZE_TOKENS }] } },
});

// @FollowsBlueprint utils-pure-module
export function composeClassName(...inputs: ClassValue[]): string {
  return mergeClassNames(clsx(inputs));
}
