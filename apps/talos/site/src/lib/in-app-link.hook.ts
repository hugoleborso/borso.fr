import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { selectInAppPath } from './wikilinks.core';

function findClickedAnchor(target: EventTarget): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest('a');
}

export function useInAppLinkClick(): (event: MouseEvent<HTMLElement>) => void {
  const navigate = useNavigate();
  return (event) => {
    const anchor = findClickedAnchor(event.target);
    const inAppPath = selectInAppPath(anchor?.getAttribute('href') ?? '');
    if (inAppPath === null) return;
    event.preventDefault();
    void navigate(inAppPath);
  };
}
