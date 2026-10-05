import { type JSX, lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/organisms/AppShell';
import { RequireSession } from './components/organisms/RequireSession';
import {
  loadBrainEntryPage,
  loadBrainPage,
  loadGraphPage,
  loadLoginPage,
  loadMessagePage,
  loadProposalsPage,
  loadSettingsPage,
  loadTodayPage,
  loadTodosPage,
} from './screen-loaders.setup';

const LoginPage = lazy(async () => ({ default: (await loadLoginPage()).LoginPage }));
const TodayPage = lazy(async () => ({ default: (await loadTodayPage()).TodayPage }));
const TodosPage = lazy(async () => ({ default: (await loadTodosPage()).TodosPage }));
const ProposalsPage = lazy(async () => ({ default: (await loadProposalsPage()).ProposalsPage }));
const BrainPage = lazy(async () => ({ default: (await loadBrainPage()).BrainPage }));
const BrainEntryPage = lazy(async () => ({
  default: (await loadBrainEntryPage()).BrainEntryPage,
}));
const GraphPage = lazy(async () => ({ default: (await loadGraphPage()).GraphPage }));
const MessagePage = lazy(async () => ({ default: (await loadMessagePage()).MessagePage }));
const SettingsPage = lazy(async () => ({ default: (await loadSettingsPage()).SettingsPage }));

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireSession />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<TodayPage />} />
              <Route path="/todos" element={<TodosPage />} />
              <Route path="/proposals" element={<ProposalsPage />} />
              <Route path="/brain" element={<BrainPage />} />
              <Route path="/brain/graph" element={<GraphPage />} />
              <Route path="/brain/page/*" element={<BrainEntryPage />} />
              <Route path="/message" element={<MessagePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
