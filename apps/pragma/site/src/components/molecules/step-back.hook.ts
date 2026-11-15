import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { readPreviousEntryUrl } from '../../lib/page-location.adapter';
import { selectBackLinkMove } from './back-link.core';

const ONE_ENTRY_BACK = -1;

export type StepBackHandler = (event: MouseEvent<HTMLAnchorElement>) => void;

export function useStepBackTo(parentPath: string): StepBackHandler {
  const navigate = useNavigate();
  return (event) => {
    if (selectBackLinkMove(event, readPreviousEntryUrl(), parentPath) === 'follow-link') return;
    event.preventDefault();
    void navigate(ONE_ENTRY_BACK);
  };
}
