import { registerSW } from 'virtual:pwa-register';
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/i18n/i18n';
import { OpeningTrainerPage } from '@/routes/OpeningTrainerPage';
import './styles/tokens.css';

registerSW();

// @FollowsBlueprint site-entrypoint
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <OpeningTrainerPage />
    </React.StrictMode>,
  );
}
