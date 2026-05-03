export function isComposeKeyEvent(event: KeyboardEvent): boolean {
  if (event.code !== 'Space') return false;
  const target = event.target;
  if (target instanceof HTMLElement) {
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return false;
  }
  return true;
}
