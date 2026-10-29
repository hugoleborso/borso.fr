import { BrowserRouter, Navigate, Route } from 'react-router-dom';
import { AppShell } from './components/organisms/AppShell';
import { ListenLinksProvider } from './components/organisms/ListenLinksProvider';
import { RequireSession } from './components/organisms/RequireSession';
import { TracedRoutes } from './observability/error-reporting.adapter';
import { AccountPage } from './routes/account/AccountPage';
import { BandPage } from './routes/band/BandPage';
import { HomePage } from './routes/home/HomePage';
import { BarsPage } from './routes/bars/BarsPage';
import { AddSongPage } from './routes/catalog/AddSongPage';
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
import { PracticeModePage } from './routes/sessions/PracticeModePage';
import { SessionAudiencePage } from './routes/sessions/SessionAudiencePage';
import { FindSlotPage } from './routes/sessions/FindSlotPage';
import { SessionDetailPage } from './routes/sessions/SessionDetailPage';
import { SessionsPage } from './routes/sessions/SessionsPage';
import { SessionSetlistRedirectPage } from './routes/setlists/SessionSetlistRedirectPage';
import { SetlistEditorPage } from './routes/setlists/SetlistEditorPage';
import { SetlistOrderPage } from './routes/setlists/SetlistOrderPage';
import { SetlistScenePage } from './routes/setlists/SetlistScenePage';
import { SetlistAudiencePage } from './routes/setlists/SetlistAudiencePage';
import { SetlistVotePage } from './routes/setlists/SetlistVotePage';
import { SetlistsPage } from './routes/setlists/SetlistsPage';
import { VotePage } from './routes/vote/VotePage';

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <ListenLinksProvider>
        <TracedRoutes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recover" element={<RecoverPage />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/vote/:sessionId" element={<VotePage />} />
          <Route element={<RequireSession />}>
            <Route path="/catalog/:songId/scene" element={<SongScenePage />} />
            <Route path="/setlists/:setlistId/scene" element={<SetlistScenePage />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/catalog/new" element={<SongEditPage />} />
              <Route path="/catalog/add" element={<AddSongPage />} />
              <Route path="/catalog/:songId/edit" element={<SongEditPage />} />
              <Route path="/catalog/:songId" element={<SongDetailPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/sessions/slots" element={<FindSlotPage />} />
              <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
              <Route path="/sessions/:sessionId/setlist" element={<SessionSetlistRedirectPage />} />
              <Route path="/sessions/:sessionId/practice" element={<PracticeModePage />} />
              <Route path="/sessions/:sessionId/audience" element={<SessionAudiencePage />} />
              <Route path="/setlists" element={<SetlistsPage />} />
              <Route path="/setlists/:setlistId" element={<SetlistEditorPage />} />
              <Route path="/setlists/:setlistId/order" element={<SetlistOrderPage />} />
              <Route path="/setlists/:setlistId/vote" element={<SetlistVotePage />} />
              <Route path="/setlists/:setlistId/audience" element={<SetlistAudiencePage />} />
              <Route path="/bars" element={<BarsPage />} />
              <Route path="/improvements" element={<ImprovementsPage />} />
              <Route path="/studies" element={<Navigate to="/catalog?filter=learning" replace />} />
              <Route path="/band" element={<BandPage />} />
              <Route path="/tasks" element={<Navigate to="/band" replace />} />
              <Route path="/compos" element={<ComposPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/instruments" element={<InstrumentsPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>
          </Route>
        </TracedRoutes>
      </ListenLinksProvider>
    </BrowserRouter>
  );
}
