/**
 * Card atom — paper-elevated surface with the editorial radius and
 * border. Mirrors `.card` from the prototype.
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { type CardVariantProps, cardVariants } from './card.variants';
import { composeClassName } from './class-name.utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement>, CardVariantProps {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...rest }, ref) => (
    <div ref={ref} className={composeClassName(cardVariants({ variant }), className)} {...rest} />
  ),
);
Card.displayName = 'Card';
