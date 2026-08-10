import { type ReactNode, useSyncExternalStore } from 'react';
import { NavigationBar } from './components/organisms/NavigationBar';
import { readPathname, readServerPathname, subscribeLocation } from './lib/navigation';
import { AdminPage } from './routes/AdminPage';
import { ArchivesPage } from './routes/ArchivesPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { parseRoute, type RouteName } from './routes/route.core';
import { RunnerProfilePage } from './routes/RunnerProfilePage';
import { SpectatorPage } from './routes/SpectatorPage';

interface PageProps {
  readonly runnerSlug: string;
}

// @FollowsBlueprint component-lookup-table
const PAGE_BY_ROUTE: Readonly<Record<RouteName, (props: PageProps) => ReactNode>> = {
  spectator: () => <SpectatorPage />,
  admin: () => <AdminPage />,
  archives: () => <ArchivesPage />,
  runner: ({ runnerSlug }) => <RunnerProfilePage runnerSlug={runnerSlug} />,
  'not-found': () => <NotFoundPage />,
};

export function App() {
  const pathname = useSyncExternalStore(subscribeLocation, readPathname, readServerPathname);
  const route = parseRoute(pathname);
  const Page = PAGE_BY_ROUTE[route.name];

  return (
    <div className="app">
      <NavigationBar />
      <Page runnerSlug={route.runnerSlug} />
    </div>
  );
}
