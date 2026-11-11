import { Route, BrowserRouter } from 'react-router-dom';
import { AppShell } from './components/organisms/AppShell';
import { CreateGamePage } from './routes/CreateGamePage';
import { GamePage } from './routes/GamePage';
import { HomePage } from './routes/HomePage';
import { TracedRoutes } from './observability/error-reporting.adapter';

// @FollowsBlueprint organism-shell
export function App() {
  return (
    <BrowserRouter>
      <TracedRoutes>
        <Route
          path="/"
          element={
            <AppShell>
              <HomePage />
            </AppShell>
          }
        />
        <Route
          path="/nouvelle-partie"
          element={
            <AppShell>
              <CreateGamePage />
            </AppShell>
          }
        />
        <Route path="/partie/:code" element={<GamePage />} />
      </TracedRoutes>
    </BrowserRouter>
  );
}
