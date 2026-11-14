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
    const keyboardHeight = Math.max(host.innerHeight - visualViewport.height, 0);
    const scrolledOverKeyboard = Math.min(Math.max(visualViewport.offsetTop, 0), keyboardHeight);
    const bottomGap = host.innerHeight - scrolledOverKeyboard - visualViewport.height;
    host.document.documentElement.style.setProperty(BOTTOM_GAP_PROPERTY, `${bottomGap}px`);
  };
  writeBottomGap();
  visualViewport.addEventListener('resize', writeBottomGap);
  visualViewport.addEventListener('scroll', writeBottomGap);
}
