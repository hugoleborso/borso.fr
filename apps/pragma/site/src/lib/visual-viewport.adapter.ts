/** @Feature shell */

export const BOTTOM_GAP_PROPERTY = '--visual-viewport-bottom-gap';

export interface VisibleArea extends EventTarget {
  readonly offsetTop: number;
  readonly height: number;
}

export interface ViewportHost {
  readonly innerHeight: number;
  readonly visualViewport: VisibleArea | null;
  readonly document: Pick<Document, 'documentElement'>;
}

/** @DependsOnExternal browser-scroll */
// @FollowsBlueprint injected-browser-api
export function pinBottomBarsToVisualViewport(host: ViewportHost = window): void {
  const visualViewport = host.visualViewport;
  if (visualViewport === null) return;
  const writeBottomGap = (): void => {
    const bottomGap = host.innerHeight - visualViewport.offsetTop - visualViewport.height;
    host.document.documentElement.style.setProperty(BOTTOM_GAP_PROPERTY, `${bottomGap}px`);
  };
  writeBottomGap();
  visualViewport.addEventListener('resize', writeBottomGap);
  visualViewport.addEventListener('scroll', writeBottomGap);
}
