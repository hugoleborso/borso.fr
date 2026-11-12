import './observability/error-reporting.setup';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { OpeningOverlay } from './components/organisms/OpeningOverlay';
import './i18n/i18n.setup';
import './styles/tokens.css';
import {
  hasOpeningPlayed,
  isMotionReduced,
  didRecordOpening,
  readSessionStorage,
} from './lib/opening.adapter';
import { shouldPlayOpening } from './lib/opening.core';
import { queryClient } from './lib/query-client.setup';
import { preloadScreensWhenIdle } from './screen-loaders.setup';
import { registerServiceWorker } from './sw/service-worker.setup';

registerServiceWorker();
preloadScreensWhenIdle();

const openingStorage = readSessionStorage();
const playsOpening = shouldPlayOpening(hasOpeningPlayed(openingStorage), isMotionReduced());
didRecordOpening(openingStorage);

// @FollowsBlueprint site-entrypoint
const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Missing #root element in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {playsOpening ? <OpeningOverlay /> : null}
    </QueryClientProvider>
  </StrictMode>,
);
