import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/organisms/AppShell';
import { ListenLinksProvider } from './components/organisms/ListenLinksProvider';
import { RequireSession } from './components/organisms/RequireSession';
import { AccountPage } from './routes/account/AccountPage';
import { BarsPage } from './routes/bars/BarsPage';
import { CatalogPage } from './routes/catalog/CatalogPage';
import { ComposPage } from './routes/compos/ComposPage';
import { SongDetailPage } from './routes/catalog/SongDetailPage';
import { SongEditPage } from './routes/catalog/SongEditPage';
import { SongScenePage } from './routes/catalog/SongScenePage';
import { ImprovementsPage } from './routes/improvements/ImprovementsPage';
import { InstrumentsPage } from './routes/instruments/InstrumentsPage';
import { RecoverPage } from './routes/RecoverPage';
import { LoginPage } from './routes/LoginPage';
import { MembersPage } from './routes/members/MembersPage';
import { TasksPage } from './routes/tasks/TasksPage';
import { SessionDetailPage } from './routes/sessions/SessionDetailPage';
import { SessionsPage } from './routes/sessions/SessionsPage';
import { SessionSetlistRedirectPage } from './routes/setlists/SessionSetlistRedirectPage';
import { SetlistEditorPage } from './routes/setlists/SetlistEditorPage';
import { SetlistScenePage } from './routes/setlists/SetlistScenePage';
import { SetlistVotePage } from './routes/setlists/SetlistVotePage';
import { SetlistsPage } from './routes/setlists/SetlistsPage';
import { VotePage } from './routes/vote/VotePage';

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <ListenLinksProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recover" element={<RecoverPage />} />
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
              <Route path="/setlists/:setlistId/vote" element={<SetlistVotePage />} />
              <Route path="/bars" element={<BarsPage />} />
              <Route path="/improvements" element={<ImprovementsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/compos" element={<ComposPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/instruments" element={<InstrumentsPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>
          </Route>
        </Routes>
      </ListenLinksProvider>
    </BrowserRouter>
  );
}
