import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initSentry } from './observability/sentry';
import './styles/tokens.css';
import './styles/chrome.css';
import './styles/components.css';
import './styles/timeline.css';
import './styles/leaderboard.css';
import './styles/map.css';
import './styles/countdown.css';
import './styles/punch.css';
import './styles/widgets.css';

initSentry();

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Missing #root element in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
