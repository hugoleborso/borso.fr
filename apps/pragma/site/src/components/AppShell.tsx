/**
 * Top-level shell — paper background, header with the app name + nav,
 * outlet for the active route. Mirrors the design bundle's "shell.jsx"
 * layout: editorial-jazz aesthetic, blue accent, comfortable density.
 *
 * The auth-gate component (`RequireSession`) handles login redirection;
 * this component assumes the user is already authenticated.
 */

import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/catalog', key: 'nav.catalog' },
  { to: '/sessions', key: 'nav.sessions' },
  { to: '/bars', key: 'nav.bars' },
  { to: '/mastery', key: 'nav.mastery' },
  { to: '/members', key: 'nav.members' },
  { to: '/instruments', key: 'nav.instruments' },
] as const;

export function AppShell(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <h1 className="app-shell-title">{t('appName')}</h1>
        <nav className="app-shell-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'app-shell-nav-link is-active' : 'app-shell-nav-link'
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-shell-main">
        <Outlet />
      </main>
    </div>
  );
}
