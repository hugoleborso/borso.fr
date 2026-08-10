import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import { App } from './App';
import './i18n/i18n';
import { initSentry } from './observability/sentry';
import './styles/tokens.css';
import './styles/chrome.css';
import './styles/components.css';
import './styles/timeline.css';
import './styles/leaderboard.css';
import './styles/map.css';
import './styles/runner-avatar.css';
import './styles/countdown.css';
import './styles/punch.css';
import './styles/widgets.css';

initSentry();

const RETRY_COUNT = 1;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: RETRY_COUNT,
    },
  },
});

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Missing #root element in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
