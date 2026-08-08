/**
 * Avatar atom — member initial in a coloured circle. The caller passes
 * the member colour, so the atom stays Tailwind-only and knows nothing
 * about the palette.
 */

import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';
import { type AvatarVariantProps, avatarVariants } from './avatar.variants';
import { composeClassName } from './class-name.utils';

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
        className={composeClassName(avatarVariants({ size }), className)}
        style={composed}
        {...rest}
      >
        {initials}
      </span>
    );
  },
);
Avatar.displayName = 'Avatar';
