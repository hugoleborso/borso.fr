export const loadLoginPage = async () => await import('./routes/LoginPage');
export const loadTodayPage = async () => await import('./routes/TodayPage');
export const loadTodosPage = async () => await import('./routes/TodosPage');
export const loadProposalsPage = async () => await import('./routes/ProposalsPage');
export const loadCommitmentsPage = async () => await import('./routes/CommitmentsPage');
export const loadTodoDetailPage = async () => await import('./routes/TodoDetailPage');
export const loadCommitmentDetailPage = async () => await import('./routes/CommitmentDetailPage');
export const loadBrainPage = async () => await import('./routes/BrainPage');
export const loadBrainEntryPage = async () => await import('./routes/BrainEntryPage');
export const loadGraphPage = async () => await import('./routes/GraphPage');
export const loadMessagePage = async () => await import('./routes/MessagePage');
export const loadSettingsPage = async () => await import('./routes/SettingsPage');
export const loadRelationsPage = async () => await import('./routes/RelationsPage');
export const loadDraftsPage = async () => await import('./routes/DraftsPage');
export const loadDraftPage = async () => await import('./routes/DraftPage');
export const loadHistoryPage = async () => await import('./routes/HistoryPage');
export const loadPastBriefPage = async () => await import('./routes/PastBriefPage');
export const loadWeeklyReviewPage = async () => await import('./routes/WeeklyReviewPage');

const SCREENS_KEPT_FOR_OFFLINE = [
  loadTodayPage,
  loadTodosPage,
  loadProposalsPage,
  loadCommitmentsPage,
  loadTodoDetailPage,
  loadCommitmentDetailPage,
  loadBrainPage,
  loadBrainEntryPage,
  loadMessagePage,
  loadSettingsPage,
  loadRelationsPage,
  loadDraftsPage,
  loadDraftPage,
  loadHistoryPage,
  loadPastBriefPage,
  loadWeeklyReviewPage,
];

function preloadScreensForOffline(): void {
  for (const loadScreen of SCREENS_KEPT_FOR_OFFLINE) void loadScreen().catch(() => undefined);
}

export function preloadScreensWhenIdle(): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(preloadScreensForOffline);
  else setTimeout(preloadScreensForOffline, 0);
}
