import type { HTMLAttributes, JSX } from 'react';
import { type ChipVariantProps, chipVariants } from './chip.variants';
import { composeClassName } from './class-name.utils';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement>, ChipVariantProps {}

// @FollowsBlueprint atom-plain
export function Chip({ className, tone, ...rest }: ChipProps): JSX.Element {
  return <span className={composeClassName(chipVariants({ tone }), className)} {...rest} />;
}
