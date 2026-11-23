import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';
import { selectInkOnMemberColor } from '../../lib/member-color.utils';
import { composeClassName } from './class-name.utils';
import { type MemberMarkVariantProps, memberMarkVariants } from './member-mark.variants';

type SpanProps = HTMLAttributes<HTMLSpanElement>;
type EmptyProps = Omit<SpanProps, 'aria-label' | 'title' | 'role' | 'children'>;
type MarkBase = Omit<MemberMarkVariantProps, 'ink' | 'shape'> & { readonly color: string };
type EmptyMark = { readonly shape: 'dot' | 'ring' } & EmptyProps;
type HoldingMark = { readonly shape: 'cell' | 'lane' } & SpanProps;
export type MemberMarkProps = MarkBase & (EmptyMark | HoldingMark);

const MEMBER_LANE_TINT_SHARE = '18%';

const STYLE_BY_SHAPE: Readonly<Record<MemberMarkProps['shape'], (color: string) => CSSProperties>> =
  {
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
