/**
 * Cascade rearranges the room on a timer. The timer is started and stopped by
 * the control the reader clicks, so no effect watches the mode.
 */
import { refreshSeedInPlace } from './composition-url';

const CASCADE_INTERVAL_MS = 5500;
const NO_INTERVAL_HANDLE = 0;

const cascade = { intervalHandle: NO_INTERVAL_HANDLE };

export function stopCascade(): void {
  window.clearInterval(cascade.intervalHandle);
  cascade.intervalHandle = NO_INTERVAL_HANDLE;
}

export function startCascade(): void {
  stopCascade();
  cascade.intervalHandle = window.setInterval(refreshSeedInPlace, CASCADE_INTERVAL_MS);
}

const CASCADE_ACTION: Readonly<Record<`${boolean}`, () => void>> = {
  true: startCascade,
  false: stopCascade,
};

export function applyCascade(isCascading: boolean): void {
  CASCADE_ACTION[`${isCascading}`]();
}
