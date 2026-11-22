import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

// @FollowsBlueprint atom-plain
export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      autoComplete="off"
      className={clsx(
        'h-13 min-w-0 rounded-chip border border-outline px-4 text-xl font-bold bg-surface text-text placeholder:text-muted-2 focus:border-accent focus:outline-none',
        className,
      )}
      {...rest}
    />
  );
}
