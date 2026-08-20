import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../i18n/i18n';
import '../styles/tokens.css';
import { installWarpDrive } from '../warp/warp-drive';
import { App } from './App';

installWarpDrive();

// @FollowsBlueprint site-entrypoint
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root not found');
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
