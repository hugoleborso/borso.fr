import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';
import { selectInkOnMemberColor } from '../../lib/member-color.utils';
import { type AvatarVariantProps, avatarVariants } from './avatar.variants';
import { composeClassName } from './class-name.utils';

export interface AvatarProps
  extends HTMLAttributes<HTMLSpanElement>, Omit<AvatarVariantProps, 'ink'> {
  readonly initials: string;
  readonly color: string;
}

// @FollowsBlueprint atom-variant
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({ initials, color, className, size, style, ...rest }, ref) => {
    const filled: CSSProperties = { backgroundColor: color, ...style };
    return (
      <span
        ref={ref}
        role="img"
        aria-label={initials}
        className={composeClassName(
          avatarVariants({ size, ink: selectInkOnMemberColor(color) }),
          className,
        )}
        style={filled}
        {...rest}
      >
        {initials}
      </span>
    );
  },
);
Avatar.displayName = 'Avatar';
