/**
 * Crumb atom — the uppercase, letter-spaced label the prototype
 * uses above page titles ("RÉPERTOIRE", "SETLIST · LES DISQUAIRES").
 * Plain `<div>` with editorial typography — no semantic landmark
 * because in the prototype it precedes the H1 and isn't a link.
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn.utils';

export type CrumbProps = HTMLAttributes<HTMLDivElement>;

export const Crumb = forwardRef<HTMLDivElement, CrumbProps>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'font-sans font-medium text-[10.5px] tracking-[0.16em] uppercase text-ink-400',
        className,
      )}
      {...rest}
    />
  ),
);
Crumb.displayName = 'Crumb';
