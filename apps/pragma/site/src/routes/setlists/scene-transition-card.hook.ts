/** @Feature setlists */

import { useCallback, useState } from 'react';

export interface SceneTransitionCardView {
  readonly isCardInView: boolean;
  readonly attachCard: (card: HTMLElement | null) => (() => void) | undefined;
}

// @FollowsBlueprint hook-stateful-helper
export function useSceneTransitionCard(): SceneTransitionCardView {
  const [isCardInView, setIsCardInView] = useState(false);
  const attachCard = useCallback((element: HTMLElement | null) => {
    if (element === null || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver((entries) => {
      setIsCardInView(entries.some((entry) => entry.isIntersecting));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      setIsCardInView(false);
    };
  }, []);
  return { isCardInView, attachCard };
}
