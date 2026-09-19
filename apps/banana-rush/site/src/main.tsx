import '@fontsource-variable/nunito/index.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AppErrorBoundary } from './components/organisms/AppErrorBoundary';
import './i18n/i18n.setup';
import './styles/tokens.css';
import { queryClient } from './lib/query-client.setup';

// @FollowsBlueprint site-entrypoint
const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Missing #root element in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
