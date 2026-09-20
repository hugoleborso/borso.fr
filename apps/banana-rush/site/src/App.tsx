import { Route, BrowserRouter, Routes } from 'react-router-dom';
import { AppShell } from './components/organisms/AppShell';
import { CreateGamePage } from './routes/CreateGamePage';
import { GamePage } from './routes/GamePage';
import { HomePage } from './routes/HomePage';

// @FollowsBlueprint organism-shell
export function App() {
  return (
    <BrowserRouter>
      <Routes>
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
      </Routes>
    </BrowserRouter>
  );
}
