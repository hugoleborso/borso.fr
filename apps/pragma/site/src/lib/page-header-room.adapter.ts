/** @Feature shell */

export const HEADER_HEIGHT_PROPERTY = '--page-header-height';

/** @DependsOnExternal browser-resize-observer */
// @FollowsBlueprint ref-callback-browser-api
export function reserveRoomForPageHeader(header: HTMLElement | null): (() => void) | undefined {
  if (header === null) return undefined;
  const rootStyle = header.ownerDocument.documentElement.style;
  const writeHeight = (): void => {
    rootStyle.setProperty(HEADER_HEIGHT_PROPERTY, `${header.getBoundingClientRect().height}px`);
  };
  writeHeight();
  const canObserve = typeof window.ResizeObserver === 'function';
  const observer = canObserve ? new ResizeObserver(writeHeight) : null;
  observer?.observe(header);
  return () => {
    observer?.disconnect();
    rootStyle.removeProperty(HEADER_HEIGHT_PROPERTY);
  };
}
