import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../i18n/i18n';
import '../styles/tokens.css';
import { App } from './App';

// @FollowsBlueprint site-entrypoint
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root not found');
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
