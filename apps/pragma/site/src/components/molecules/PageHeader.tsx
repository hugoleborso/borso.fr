import type { ReactNode } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Overline } from '../atoms/Overline';
import { reserveRoomForPageHeader } from '../../lib/page-header-room.adapter';
import { BackLink } from './BackLink';

export interface PageHeaderBack {
  readonly to: string;
  readonly label: string;
}

export interface PageHeaderProps {
  crumb?: ReactNode;
  back?: PageHeaderBack;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  inline?: ReactNode;
  leading?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export const PINNED_HEADER_CLASS =
  'fixed inset-x-0 top-0 z-20 border-b border-rule bg-paper px-4 ' +
  'pt-[calc(0.5rem+env(safe-area-inset-top))] pb-3 sm:px-9 ' +
  'lg:sticky lg:inset-x-auto lg:-mx-9 lg:-mt-[calc(0.5rem+env(safe-area-inset-top))] lg:mb-5 ' +
  'has-[[data-page-header-children]_[role=tablist]]:border-b-0';

const TITLE_CLASS = 'm-0 font-display text-display text-ink wrap-anywhere line-clamp-3 sm:mb-1';

// @FollowsBlueprint molecule-presentational
export function PageHeader({
  crumb,
  back,
  title,
  subtitle,
  actions,
  inline,
  leading,
  children,
  className,
}: PageHeaderProps): JSX.Element {
  return (
    <header
      ref={reserveRoomForPageHeader}
      data-page-header
      className={composeClassName(PINNED_HEADER_CLASS, className)}
    >
      {back === undefined ? null : <BackLink to={back.to} label={back.label} />}
      {crumb !== undefined && crumb !== null && (
        <Overline className="mb-2 hidden sm:block">{crumb}</Overline>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div
          className={composeClassName(
            'flex min-w-0 flex-1 basis-40 items-start gap-3',
            inline !== undefined && 'items-center sm:gap-6',
          )}
        >
          {leading}
          <div
            className={composeClassName('min-w-0', inline === undefined ? 'flex-1' : 'shrink-0')}
          >
            <h1 className={TITLE_CLASS}>{title}</h1>
            {subtitle !== undefined && subtitle !== null && (
              <div className="text-meta text-ink-soft">{subtitle}</div>
            )}
          </div>
          {inline === undefined ? null : (
            <div className="min-w-0 flex-1 sm:max-w-[380px]">{inline}</div>
          )}
        </div>
        {actions !== undefined && actions !== null && (
          <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {children === undefined ? null : (
        <div data-page-header-children className="mt-2 sm:mt-3">
          {children}
        </div>
      )}
    </header>
  );
}
