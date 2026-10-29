/** @Feature auth */

/** @DependsOnExternal browser-location */
export function readPageOrigin(): string {
  return window.location.origin;
}

export function leavePageFor(address: string): void {
  window.location.assign(address);
}
