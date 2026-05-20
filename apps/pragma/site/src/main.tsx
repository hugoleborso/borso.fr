import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './i18n/i18n';
import './styles/design-tokens.css';
import './styles/shell.css';
import './styles/member-music.css';
import './styles/setlist-bars.css';
import { registerServiceWorker } from './sw/register-sw';

registerServiceWorker();

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Missing #root element in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
