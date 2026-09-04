import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/organisms/AppShell';
import { RequireSession } from './components/organisms/RequireSession';
import { BarsPage } from './routes/bars/BarsPage';
import { CatalogPage } from './routes/catalog/CatalogPage';
import { SongDetailPage } from './routes/catalog/SongDetailPage';
import { SongEditPage } from './routes/catalog/SongEditPage';
import { SongScenePage } from './routes/catalog/SongScenePage';
import { InstrumentsPage } from './routes/instruments/InstrumentsPage';
import { LoginPage } from './routes/LoginPage';
import { MembersPage } from './routes/members/MembersPage';
import { SessionDetailPage } from './routes/sessions/SessionDetailPage';
import { SessionsPage } from './routes/sessions/SessionsPage';
import { SessionSetlistRedirectPage } from './routes/setlists/SessionSetlistRedirectPage';
import { SetlistEditorPage } from './routes/setlists/SetlistEditorPage';
import { SetlistScenePage } from './routes/setlists/SetlistScenePage';
import { SetlistsPage } from './routes/setlists/SetlistsPage';
import { VotePage } from './routes/vote/VotePage';

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/vote" element={<VotePage />} />
        <Route path="/vote/:sessionId" element={<VotePage />} />
        <Route element={<RequireSession />}>
          <Route path="/catalog/:songId/scene" element={<SongScenePage />} />
          <Route path="/setlists/:setlistId/scene" element={<SetlistScenePage />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/catalog" replace />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/catalog/new" element={<SongEditPage />} />
            <Route path="/catalog/:songId/edit" element={<SongEditPage />} />
            <Route path="/catalog/:songId" element={<SongDetailPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
            <Route path="/sessions/:sessionId/setlist" element={<SessionSetlistRedirectPage />} />
            <Route path="/setlists" element={<SetlistsPage />} />
            <Route path="/setlists/:setlistId" element={<SetlistEditorPage />} />
            <Route path="/bars" element={<BarsPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/instruments" element={<InstrumentsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
