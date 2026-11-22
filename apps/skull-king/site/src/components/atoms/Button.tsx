import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

const VARIANTS = {
  primary:
    'h-16 gap-2.5 rounded-action px-5 text-xl font-extrabold bg-accent text-accent-ink disabled:opacity-40',
  surface: 'size-11 rounded-chip bg-surface text-text',
  outline:
    'size-13 rounded-chip border border-accent bg-transparent text-accent disabled:opacity-40',
  dashed:
    'size-16 rounded-full border-2 border-dashed border-outline-strong bg-transparent text-muted',
  made: 'size-13 rounded-chip bg-made text-ground',
  missed: 'size-13 rounded-chip bg-missed text-ground',
  quiet: 'size-11 rounded-chip bg-transparent text-text',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant: keyof typeof VARIANTS;
}

// @FollowsBlueprint atom-variant-table
export function Button({ variant, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'flex shrink-0 cursor-pointer items-center justify-center disabled:cursor-default',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}
