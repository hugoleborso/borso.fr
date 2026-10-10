import { type JSX, lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/organisms/AppShell';
import { RequireSession } from './components/organisms/RequireSession';
import {
  loadBrainEntryPage,
  loadBrainPage,
  loadCommitmentDetailPage,
  loadCommitmentsPage,
  loadDraftPage,
  loadDraftsPage,
  loadGraphPage,
  loadHistoryPage,
  loadLoginPage,
  loadMessagePage,
  loadPastBriefPage,
  loadProposalsPage,
  loadRelationsPage,
  loadSettingsPage,
  loadTodayPage,
  loadTodoDetailPage,
  loadTodosPage,
  loadWeeklyReviewPage,
} from './screen-loaders.setup';

const LoginPage = lazy(async () => ({ default: (await loadLoginPage()).LoginPage }));
const TodayPage = lazy(async () => ({ default: (await loadTodayPage()).TodayPage }));
const TodosPage = lazy(async () => ({ default: (await loadTodosPage()).TodosPage }));
const ProposalsPage = lazy(async () => ({ default: (await loadProposalsPage()).ProposalsPage }));
const CommitmentsPage = lazy(async () => ({
  default: (await loadCommitmentsPage()).CommitmentsPage,
}));
const TodoDetailPage = lazy(async () => ({
  default: (await loadTodoDetailPage()).TodoDetailPage,
}));
const CommitmentDetailPage = lazy(async () => ({
  default: (await loadCommitmentDetailPage()).CommitmentDetailPage,
}));
const BrainPage = lazy(async () => ({ default: (await loadBrainPage()).BrainPage }));
const BrainEntryPage = lazy(async () => ({
  default: (await loadBrainEntryPage()).BrainEntryPage,
}));
const GraphPage = lazy(async () => ({ default: (await loadGraphPage()).GraphPage }));
const MessagePage = lazy(async () => ({ default: (await loadMessagePage()).MessagePage }));
const SettingsPage = lazy(async () => ({ default: (await loadSettingsPage()).SettingsPage }));
const RelationsPage = lazy(async () => ({ default: (await loadRelationsPage()).RelationsPage }));
const DraftsPage = lazy(async () => ({ default: (await loadDraftsPage()).DraftsPage }));
const DraftPage = lazy(async () => ({ default: (await loadDraftPage()).DraftPage }));
const HistoryPage = lazy(async () => ({ default: (await loadHistoryPage()).HistoryPage }));
const PastBriefPage = lazy(async () => ({ default: (await loadPastBriefPage()).PastBriefPage }));
const WeeklyReviewPage = lazy(async () => ({
  default: (await loadWeeklyReviewPage()).WeeklyReviewPage,
}));

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
              <Route path="/todos/:id" element={<TodoDetailPage />} />
              <Route path="/commitments" element={<CommitmentsPage />} />
              <Route path="/commitments/*" element={<CommitmentDetailPage />} />
              <Route path="/relations" element={<RelationsPage />} />
              <Route path="/drafts" element={<DraftsPage />} />
              <Route path="/drafts/:slug" element={<DraftPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/history/briefs/:date" element={<PastBriefPage />} />
              <Route path="/history/reviews/:week" element={<WeeklyReviewPage />} />
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
