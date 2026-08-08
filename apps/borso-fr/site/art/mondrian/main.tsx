import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/playfair-display/500.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/300-italic.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/jetbrains-mono/300.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../i18n/i18n';
import { App } from './App';
import {
  composeNewSeed,
  INITIAL_STATE,
  mirrorResolvedStateIntoUrl,
  readCurrentPaletteKey,
} from './composition-url';
import { isComposeKeyEvent } from './keyboard.utils';
import { applyPaperTheme } from './paper-theme';
import './styles/base.css';
import './styles/rail.css';
import './styles/controls.css';
import './styles/stage.css';
import './styles/responsive.css';

const COMPOSE_ON_SPACE: Readonly<Record<`${boolean}`, (event: KeyboardEvent) => void>> = {
  true: (event) => {
    event.preventDefault();
    composeNewSeed();
  },
  false: () => undefined,
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root not found');

mirrorResolvedStateIntoUrl();
applyPaperTheme(INITIAL_STATE.paletteKey);

window.addEventListener('popstate', () => {
  applyPaperTheme(readCurrentPaletteKey());
});

window.addEventListener('keydown', (event) => {
  COMPOSE_ON_SPACE[`${isComposeKeyEvent(event)}`](event);
});

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
