import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import {
  navigate,
  readPathname,
  readServerPathname,
  subscribeLocation,
} from '../../lib/navigation';
import { type RouteName, selectNavigationClassName } from '../../routes/route.core';
import { LanguageSwitcher } from '../molecules/LanguageSwitcher';

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
    <nav className="topbar">
      <div className="brand">
        <span className="brand-mark" />
        <span>{t('nav.brand')}</span>
        <small>{t('nav.edition-year')}</small>
      </div>
      <div className="nav">
        {ENTRIES.map((entry) => (
          <a
            key={entry.path}
            href={entry.path}
            className={selectNavigationClassName(pathname, entry.route)}
            onClick={(event) => {
              event.preventDefault();
              navigate(entry.path);
            }}
          >
            {t(entry.labelKey)}
          </a>
        ))}
      </div>
      <div className="topbar-right">
        <LanguageSwitcher />
      </div>
    </nav>
  );
}
