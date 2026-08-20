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

/**
 * @Blueprint browser-edge-module
 * @BlueprintName Browser Edge Module
 * @BlueprintUsage Use for the one module that owns a browser system a React tree cannot hold, such as a timer, the history entry, or a canvas export.
 * @BlueprintDescription Keeps the interval handle in a single module-level record that `startCascade` and `stopCascade` write, and exposes one entry the control calls, which indexes a boolean-keyed table of the two actions rather than branching. The handle lives outside React, so turning the mode on and off is an event handler rather than an effect watching state.
 */
export function applyCascade(isCascading: boolean): void {
  CASCADE_ACTION[`${isCascading}`]();
}
