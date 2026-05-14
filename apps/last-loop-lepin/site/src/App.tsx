import { useSyncExternalStore } from 'react';
import { AdminPage } from './routes/AdminPage';
import { ArchivesPage } from './routes/ArchivesPage';
import { RunnerFichePage } from './routes/RunnerFichePage';
import { SpectatorPage } from './routes/SpectatorPage';

const listeners = new Set<() => void>();

function subscribeLocation(listener: () => void): () => void {
  listeners.add(listener);
  const handlePopstate = (): void => listener();
  window.addEventListener('popstate', handlePopstate);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', handlePopstate);
  };
}

function getLocationSnapshot(): string {
  return window.location.pathname;
}

function getServerSnapshot(): string {
  return '/';
}

function navigate(path: string): void {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  for (const listener of listeners) listener();
}

function parsePath(path: string): {
  route: 'spectator' | 'runner' | 'admin' | 'archives' | 'not-found';
  params: Record<string, string>;
} {
  if (path === '/' || path === '/spectator') return { route: 'spectator', params: {} };
  if (path === '/admin') return { route: 'admin', params: {} };
  if (path === '/archives') return { route: 'archives', params: {} };
  const runnerMatch = /^\/r\/([a-z0-9-]+)$/.exec(path);
  if (runnerMatch !== null) {
    const slug = runnerMatch[1];
    if (slug !== undefined) return { route: 'runner', params: { runnerSlug: slug } };
  }
  return { route: 'not-found', params: {} };
}

function NavBar() {
  const pathname = useSyncExternalStore(subscribeLocation, getLocationSnapshot, getServerSnapshot);
  return (
    <nav className="topbar">
      <div className="brand">
        <span className="brand-mark" />
        <span>Last Loop Lépin</span>
        <small>2026</small>
      </div>
      <div className="nav">
        <a
          href="/"
          className={pathname === '/' || pathname === '/spectator' ? 'active' : ''}
          onClick={(event) => {
            event.preventDefault();
            navigate('/');
          }}
        >
          Course
        </a>
        <a
          href="/archives"
          className={pathname === '/archives' ? 'active' : ''}
          onClick={(event) => {
            event.preventDefault();
            navigate('/archives');
          }}
        >
          Archives
        </a>
        <a
          href="/admin"
          className={pathname.startsWith('/admin') ? 'active' : ''}
          onClick={(event) => {
            event.preventDefault();
            navigate('/admin');
          }}
        >
          Admin
        </a>
      </div>
    </nav>
  );
}

export function App() {
  const pathname = useSyncExternalStore(subscribeLocation, getLocationSnapshot, getServerSnapshot);
  const { route, params } = parsePath(pathname);

  return (
    <div className="app">
      <NavBar />
      {route === 'spectator' ? <SpectatorPage /> : null}
      {route === 'admin' ? <AdminPage /> : null}
      {route === 'archives' ? <ArchivesPage /> : null}
      {route === 'runner' ? (
        <RunnerFichePage editionSlug="lepin-2026" runnerSlug={params.runnerSlug ?? ''} />
      ) : null}
      {route === 'not-found' ? (
        <div className="main">
          <div className="card">
            <div className="card-body muted">Page introuvable.</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
