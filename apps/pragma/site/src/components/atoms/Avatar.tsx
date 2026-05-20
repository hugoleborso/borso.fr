/**
 * Avatar atom — member initial in a coloured circle. The colour is
 * driven by an inline `--mc` custom property so the atom can stay
 * Tailwind-only and the caller picks the member token (e.g.
 * `color-member-coral`). Sizes mirror the prototype's `.mchip` /
 * `.mchip.lg` / `.mchip.xl`.
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react';
import { cn } from './cn.utils';

export const avatarVariants = cva(
  'inline-flex items-center justify-center rounded-full flex-shrink-0 font-semibold text-bg-elev tracking-wide',
  {
    variants: {
      size: {
        sm: 'w-[22px] h-[22px] text-[10.5px]',
        md: 'w-7 h-7 text-xs',
        lg: 'w-10 h-10 text-sm',
      },
    },
    defaultVariants: { size: 'sm' },
  },
);

export type AvatarVariantProps = VariantProps<typeof avatarVariants>;

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement>, AvatarVariantProps {
  /** Initials (one or two letters) drawn in the circle. */
  initials: string;
  /** CSS color (hex, var(), etc.) — drives the background fill. */
  color: string;
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({ initials, color, className, size, style, ...rest }, ref) => {
    const composed: CSSProperties = { backgroundColor: color, ...style };
    return (
      <span
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        style={composed}
        {...rest}
      >
        {initials}
      </span>
    );
  },
);
Avatar.displayName = 'Avatar';
