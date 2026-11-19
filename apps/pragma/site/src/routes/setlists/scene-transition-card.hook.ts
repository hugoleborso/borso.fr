/** @Feature setlists */

import { useCallback, useRef, useState } from 'react';

export interface SceneTransitionCardView {
  readonly isCardInView: boolean;
  readonly attachCard: (card: HTMLElement | null) => (() => void) | undefined;
  readonly revealCard: () => void;
}

const REVEAL: ScrollIntoViewOptions = { behavior: 'smooth', block: 'end' };

// @FollowsBlueprint hook-stateful-helper
export function useSceneTransitionCard(): SceneTransitionCardView {
  const [isCardInView, setIsCardInView] = useState(false);
  const card = useRef<HTMLElement | null>(null);
  const attachCard = useCallback((element: HTMLElement | null) => {
    card.current = element;
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
  const revealCard = useCallback(() => {
    card.current?.scrollIntoView(REVEAL);
  }, []);
  return { isCardInView, attachCard, revealCard };
}
