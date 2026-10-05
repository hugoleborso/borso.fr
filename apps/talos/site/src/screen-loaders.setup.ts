export const loadLoginPage = async () => await import('./routes/LoginPage');
export const loadTodayPage = async () => await import('./routes/TodayPage');
export const loadTodosPage = async () => await import('./routes/TodosPage');
export const loadProposalsPage = async () => await import('./routes/ProposalsPage');
export const loadBrainPage = async () => await import('./routes/BrainPage');
export const loadBrainEntryPage = async () => await import('./routes/BrainEntryPage');
export const loadGraphPage = async () => await import('./routes/GraphPage');
export const loadMessagePage = async () => await import('./routes/MessagePage');
export const loadSettingsPage = async () => await import('./routes/SettingsPage');

const SCREENS_KEPT_FOR_OFFLINE = [
  loadTodayPage,
  loadTodosPage,
  loadProposalsPage,
  loadBrainPage,
  loadBrainEntryPage,
  loadMessagePage,
  loadSettingsPage,
];

function preloadScreensForOffline(): void {
  for (const loadScreen of SCREENS_KEPT_FOR_OFFLINE) void loadScreen().catch(() => undefined);
}

export function preloadScreensWhenIdle(): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(preloadScreensForOffline);
  else setTimeout(preloadScreensForOffline, 0);
}
