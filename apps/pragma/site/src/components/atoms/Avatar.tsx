import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';
import { type AvatarVariantProps, avatarVariants } from './avatar.variants';
import { composeClassName } from './class-name.utils';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement>, AvatarVariantProps {
  initials: string;
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
