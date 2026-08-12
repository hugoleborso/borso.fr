/**
 * The button's variant tables, kept out of `Button.tsx` so that file exports
 * only components, and shared with `ButtonLink` so the two never drift.
 *
 * No table repeats a declaration another table sets. Two utilities writing the
 * same property resolve by their order in the built stylesheet rather than by
 * their order in the attribute, so a base class that a variant overrides would
 * be a coin toss.
 */

export type ButtonVariant = 'default' | 'primary' | 'danger';
export type ButtonSize = 'default' | 'small';
export type ButtonJustify = 'center' | 'between';

export const BUTTON_BASE_CLASS = 'inline-flex items-center gap-2 min-h-11 rounded-lg border';

export const BUTTON_CLASS_BY_VARIANT: Readonly<Record<ButtonVariant, string>> = {
  default: 'border-line bg-bg-elev text-ink font-medium',
  primary: 'border-accent bg-accent text-accent-ink font-semibold',
  danger: 'border-danger-line bg-transparent text-danger font-medium',
};

export const BUTTON_CLASS_BY_SIZE: Readonly<Record<ButtonSize, string>> = {
  default: 'px-4 py-2.5 text-[13px]',
  small: 'px-2.5 py-1.5 text-[12px]',
};

export const BUTTON_CLASS_BY_JUSTIFY: Readonly<Record<ButtonJustify, string>> = {
  center: 'justify-center',
  between: 'justify-between',
};
