import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';

export interface ListRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
  readonly isChevronShown?: boolean;
}

const ROW_CLASS =
  'flex w-full min-h-11 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left text-ink ' +
  'disabled:cursor-not-allowed focus-visible:outline-3 focus-visible:outline-focus';

// @FollowsBlueprint molecule-presentational
export const ListRow = forwardRef<HTMLButtonElement, ListRowProps>(
  (
    { leading, trailing, isChevronShown = true, className, type = 'button', children, ...rest },
    ref,
  ) => (
    <button ref={ref} type={type} className={composeClassName(ROW_CLASS, className)} {...rest}>
      {leading}
      {children}
      {trailing}
      {isChevronShown ? <Icon name="chevR" className="ml-auto text-ink-faint" /> : null}
    </button>
  ),
);
ListRow.displayName = 'ListRow';
