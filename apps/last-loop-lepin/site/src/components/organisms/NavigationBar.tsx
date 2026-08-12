import clsx from 'clsx';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import {
  navigate,
  readPathname,
  readServerPathname,
  subscribeLocation,
} from '../../lib/navigation';
import { type RouteName, selectNavigationState } from '../../routes/route.core';
import { LanguageSwitcher } from '../molecules/LanguageSwitcher';
import {
  NAVIGATION_ITEM_CLASS,
  NAVIGATION_ITEM_CLASS_BY_STATE,
  NAVIGATION_LIST_CLASS,
} from './navigation-styles';

interface NavigationEntry {
  readonly path: string;
  readonly route: RouteName;
  readonly labelKey: 'nav.race' | 'nav.archives' | 'nav.admin';
}

const ENTRIES: readonly NavigationEntry[] = [
  { path: '/', route: 'spectator', labelKey: 'nav.race' },
  { path: '/archives', route: 'archives', labelKey: 'nav.archives' },
  { path: '/admin', route: 'admin', labelKey: 'nav.admin' },
];

// @FollowsBlueprint organism-shell
export function NavigationBar() {
  const { t } = useTranslation();
  const pathname = useSyncExternalStore(subscribeLocation, readPathname, readServerPathname);
  return (
    <nav className="sticky top-0 z-5 flex flex-wrap items-center gap-4 min-h-14 px-6 py-2 border-b border-line bg-bg">
      <div className="flex items-center gap-3 font-display text-[14px] font-bold uppercase tracking-[0.02em]">
        <span className="relative shrink-0 w-[22px] h-[22px] rounded-full border-[1.5px] border-ink after:content-[''] after:absolute after:inset-1 after:rounded-full after:border-[1.5px] after:border-accent after:border-r-transparent after:border-b-transparent after:rotate-[-30deg]" />
        <span>{t('nav.brand')}</span>
        <small className="ml-1 font-medium text-ink-3">{t('nav.edition-year')}</small>
      </div>
      <div className={NAVIGATION_LIST_CLASS}>
        {ENTRIES.map((entry) => (
          <a
            key={entry.path}
            href={entry.path}
            className={clsx(
              NAVIGATION_ITEM_CLASS,
              NAVIGATION_ITEM_CLASS_BY_STATE[selectNavigationState(pathname, entry.route)],
            )}
            onClick={(event) => {
              event.preventDefault();
              navigate(entry.path);
            }}
          >
            {t(entry.labelKey)}
          </a>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-4">
        <LanguageSwitcher />
      </div>
    </nav>
  );
}
