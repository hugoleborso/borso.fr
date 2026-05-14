import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Galaxy } from './components/Galaxy';

// Frozen params from the Claude Design chat — Hugo's tuning of the
// react-bits Galaxy. Tweaks panel is intentionally out of scope; see
// docs/features/borso-fr/front-page-redesign/spec/spec.md (Q.O.D. "Tweaks panel").
const GALAXY_PARAMS = {
  starSpeed: 0.3,
  density: 2.2,
  hueShift: 205,
  speed: 1.2,
  glowIntensity: 0.25,
  saturation: 0.2,
  twinkleIntensity: 0.3,
  rotationSpeed: 0.1,
  repulsionStrength: 2,
  mouseRepulsion: true,
  transparent: false,
} as const;

const mountElement = document.getElementById('bg-canvas-wrap');
if (!mountElement) throw new Error('#bg-canvas-wrap not found');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

createRoot(mountElement).render(
  <StrictMode>
    <Galaxy {...GALAXY_PARAMS} disableAnimation={prefersReducedMotion} />
  </StrictMode>,
);
