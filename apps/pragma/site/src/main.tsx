import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/jetbrains-mono';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './i18n/i18n';
import './styles/tokens.css';
import { queryClient } from './lib/query-client';
import { registerServiceWorker } from './sw/register-sw';

registerServiceWorker();

/**
 * @Blueprint site-entrypoint
 * @BlueprintName Site Entry Point
 * @BlueprintUsage Use for the module a browser loads first, which mounts React and nothing else.
 * @BlueprintDescription Imports the translation setup and the token stylesheet for their side effects, starts the worker, then mounts one component tree under the providers the whole application shares. The missing root element throws rather than failing silently, and every provider is created in its own module so this file holds configuration for nothing.
 */
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
