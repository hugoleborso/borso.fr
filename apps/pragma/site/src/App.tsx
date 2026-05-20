/**
 * Router root. All gated routes live under `<RequireSession>`; the
 * single public route is /login. The shell mounts the header + nav and
 * an outlet for the active route.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/organisms/AppShell';
import { RequireSession } from './components/organisms/RequireSession';
import { Login } from './routes/Login';
import { InstrumentsPage } from './routes/instruments/InstrumentsPage';
import { MembersPage } from './routes/members/MembersPage';
import { CatalogPage } from './routes/catalog/CatalogPage';
import { SongDetailPage } from './routes/catalog/SongDetailPage';
import { SongScenePage } from './routes/catalog/SongScenePage';
import { SessionsPage } from './routes/sessions/SessionsPage';
import { SessionDetailPage } from './routes/sessions/SessionDetailPage';
import { BarsPage } from './routes/bars/BarsPage';

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireSession />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/catalog" replace />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/catalog/:songId" element={<SongDetailPage />} />
            <Route path="/catalog/:songId/scene" element={<SongScenePage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
            <Route path="/bars" element={<BarsPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/instruments" element={<InstrumentsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
