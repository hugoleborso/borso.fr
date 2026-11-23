import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';
import { selectInkOnMemberColor } from '../../lib/member-color.utils';
import { composeClassName } from './class-name.utils';
import { type MemberMarkVariantProps, memberMarkVariants } from './member-mark.variants';

export type MemberMarkShape = NonNullable<MemberMarkVariantProps['shape']>;

type UnnamedSpanProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  'aria-label' | 'title' | 'role' | 'children'
>;

interface EmptyMarkProps extends UnnamedSpanProps {
  readonly shape: 'dot' | 'ring';
}

interface HoldingMarkProps extends HTMLAttributes<HTMLSpanElement> {
  readonly shape: 'cell' | 'lane';
}

export type MemberMarkProps = (EmptyMarkProps | HoldingMarkProps) &
  Omit<MemberMarkVariantProps, 'ink' | 'shape'> & { readonly color: string };

const MEMBER_LANE_TINT_SHARE = '18%';

const STYLE_BY_SHAPE: Readonly<Record<MemberMarkShape, (color: string) => CSSProperties>> = {
  dot: (color) => ({ backgroundColor: color }),
  ring: (color) => ({ borderColor: color }),
  cell: (color) => ({ backgroundColor: color }),
  lane: (color) => ({
    backgroundColor: `color-mix(in srgb, ${color} ${MEMBER_LANE_TINT_SHARE}, var(--color-paper))`,
  }),
};

// @FollowsBlueprint atom-variant
export const MemberMark = forwardRef<HTMLSpanElement, MemberMarkProps>(
  ({ color, shape, className, style, ...rest }, ref) => (
    <span
      ref={ref}
      className={composeClassName(
        memberMarkVariants({ shape, ink: selectInkOnMemberColor(color) }),
        className,
      )}
      style={{ ...STYLE_BY_SHAPE[shape](color), ...style }}
      aria-hidden={shape === 'dot' || shape === 'ring' ? true : undefined}
      {...rest}
    />
  ),
);
MemberMark.displayName = 'MemberMark';
