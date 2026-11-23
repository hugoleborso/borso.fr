import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

const ACTION = 'gap-2.5 rounded-action px-5 text-xl font-extrabold disabled:opacity-40';

const VARIANTS = {
  primary: `${ACTION} bg-accent text-accent-ink`,
  secondary: `${ACTION} bg-surface-2 text-text`,
  surface: 'rounded-chip bg-surface text-text',
  raised: 'rounded-chip bg-surface-2 text-text disabled:opacity-40',
  danger: 'rounded-chip bg-surface-2 text-missed disabled:opacity-40',
  tile: 'rounded-tile bg-surface text-text',
  outline: 'rounded-chip border border-accent bg-transparent text-accent disabled:opacity-40',
  dashed: 'rounded-full border-2 border-dashed border-outline-strong bg-transparent text-muted',
  made: 'rounded-chip bg-made text-ground',
  missed: 'rounded-chip bg-missed text-ground',
  quiet: 'rounded-chip bg-transparent text-text',
} as const;

const SIZES = {
  action: 'h-16',
  step: 'h-11 w-14 text-lg font-extrabold',
  icon: 'size-11',
  tile: 'size-12',
  large: 'size-13',
  larger: 'size-14',
  huge: 'size-16',
} as const;

type ButtonVariant = keyof typeof VARIANTS;

const DEFAULT_SIZES: Readonly<Record<ButtonVariant, keyof typeof SIZES>> = {
  primary: 'action',
  secondary: 'action',
  surface: 'icon',
  raised: 'larger',
  danger: 'larger',
  tile: 'tile',
  outline: 'large',
  dashed: 'huge',
  made: 'large',
  missed: 'large',
  quiet: 'icon',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant: ButtonVariant;
  readonly size?: keyof typeof SIZES;
}

// @FollowsBlueprint atom-variant-table
export function Button({
  variant,
  size = DEFAULT_SIZES[variant],
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'flex shrink-0 cursor-pointer items-center justify-center disabled:cursor-default',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  );
}
