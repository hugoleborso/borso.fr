import { useTranslation } from 'react-i18next';
import {
  DRAFT_SHEET_ACTION,
  type DraftSheetIntent,
  selectDraftSheetIntents,
} from '../components/organisms/draft-board.core';
import type { ActionSheetAction } from './action-sheet.hook';
import { didCopyTextToClipboard } from './clipboard.adapter';
import { useChangeDraftStatus } from './queries/drafts.queries';
import { COPIED_TOAST, COPY_FAILED_TOAST } from './queries/mutation-toasts.core';
import { showToast } from './toast.hook';

export interface DraftActionTarget {
  readonly slug: string;
  readonly status: string;
  readonly body: string;
  readonly link?: string;
}

export interface DraftActions {
  readonly copy: (body: string) => void;
  readonly markSent: (slug: string) => void;
  readonly abandon: (slug: string) => void;
  readonly isWriting: boolean;
  readonly selectSheetActions: (draft: DraftActionTarget) => ActionSheetAction[];
}

const NEW_TAB_TARGET = '_blank';
const NEW_TAB_FEATURES = 'noopener';

export function useDraftActions(): DraftActions {
  const { t } = useTranslation();
  const changeStatus = useChangeDraftStatus();
  const copy = (body: string): void => {
    void didCopyTextToClipboard(body).then((didCopy) => {
      const toast = didCopy ? COPIED_TOAST : COPY_FAILED_TOAST;
      showToast({ tone: toast.tone, message: t(toast.messageKey) });
    });
  };
  const markSent = (slug: string): void => {
    changeStatus.mutate({ slug, status: 'envoye' });
  };
  const abandon = (slug: string): void => {
    changeStatus.mutate({ slug, status: 'abandonne' });
  };
  const selectSheetActions = (draft: DraftActionTarget): ActionSheetAction[] => {
    const intents: Readonly<Record<DraftSheetIntent, () => void>> = {
      copy: () => copy(draft.body),
      'open-link': () => void window.open(draft.link, NEW_TAB_TARGET, NEW_TAB_FEATURES),
      sent: () => markSent(draft.slug),
      abandon: () => abandon(draft.slug),
    };
    return selectDraftSheetIntents(draft).map((intent) => ({
      ...DRAFT_SHEET_ACTION[intent],
      onSelect: intents[intent],
    }));
  };
  return { copy, markSent, abandon, isWriting: changeStatus.isPending, selectSheetActions };
}
