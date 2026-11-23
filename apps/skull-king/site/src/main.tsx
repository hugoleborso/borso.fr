import './observability/error-reporting.setup';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route } from 'react-router-dom';
import { TracedRoutes } from './observability/error-reporting.adapter';
import { RootPage } from './routes/RootPage';
import { AppErrorBoundary } from './components/organisms/AppErrorBoundary';
import './i18n/i18n.setup';
import './styles/tokens.css';
import { queryClient } from './lib/query-client.setup';
import { registerServiceWorker } from './sw/service-worker.setup';

// @FollowsBlueprint site-entrypoint
const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Missing #root element in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TracedRoutes>
            <Route path="*" element={<RootPage />} />
          </TracedRoutes>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);

registerServiceWorker();
