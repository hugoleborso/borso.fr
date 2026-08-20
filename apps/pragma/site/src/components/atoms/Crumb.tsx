import { forwardRef, type HTMLAttributes } from 'react';
import { composeClassName } from './class-name.utils';

export type CrumbProps = HTMLAttributes<HTMLDivElement>;

/**
 * @Blueprint atom-plain
 * @BlueprintName Plain Atom
 * @BlueprintUsage Use for a user interface primitive that has one look and therefore needs no variant table.
 * @BlueprintDescription Renders a single element with one fixed class string, merges the caller's `className` through composeClassName rather than string concatenation, and forwards the remaining props and the ref onto the DOM node. It imports no other component and knows no domain type, which is what keeps the atomic import direction one way.
 */
export const Crumb = forwardRef<HTMLDivElement, CrumbProps>(({ className, ...rest }, ref) => (
  <div
    ref={ref}
    className={composeClassName(
      'font-sans font-medium text-xs tracking-[0.16em] uppercase text-ink-400',
      className,
    )}
    {...rest}
  />
));
Crumb.displayName = 'Crumb';
