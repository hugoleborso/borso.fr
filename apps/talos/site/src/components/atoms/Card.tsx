import type { HTMLAttributes, JSX } from 'react';
import { type CardVariantProps, cardVariants } from './card.variants';
import { composeClassName } from './class-name.utils';

export interface CardProps extends HTMLAttributes<HTMLElement>, CardVariantProps {}

// @FollowsBlueprint atom-plain
export function Card({ className, tone, padding, ...rest }: CardProps): JSX.Element {
  return (
    <section className={composeClassName(cardVariants({ tone, padding }), className)} {...rest} />
  );
}
