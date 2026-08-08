/**
 * Crumb atom — the uppercase, letter-spaced label the prototype
 * uses above page titles, e.g. the catalog crumb and the setlist crumb.
 * Plain `<div>` with editorial typography — no semantic landmark
 * because in the prototype it precedes the H1 and isn't a link.
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { composeClassName } from './class-name.utils';

export type CrumbProps = HTMLAttributes<HTMLDivElement>;

export const Crumb = forwardRef<HTMLDivElement, CrumbProps>(({ className, ...rest }, ref) => (
  <div
    ref={ref}
    className={composeClassName(
      'font-sans font-medium text-[10.5px] tracking-[0.16em] uppercase text-ink-400',
      className,
    )}
    {...rest}
  />
));
Crumb.displayName = 'Crumb';
