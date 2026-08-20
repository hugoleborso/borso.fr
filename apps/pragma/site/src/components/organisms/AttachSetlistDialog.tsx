/**
 * Modal that attaches a setlist the band already wrote to this session.
 * It offers only the setlists the session does not already carry, so
 * the list is what can actually be picked rather than everything with
 * half the rows inert.
 * @Feature setlists
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openDialogOnAttach } from '../../lib/modal-dialog.adapter';
import {
  type SetlistSummary,
  useLinkSetlistToSession,
  useSetlistsList,
} from '../../lib/queries/setlists.queries';
import { selectSetlistsNotOnSession } from '../../lib/queries/setlists.utils';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

interface AttachSetlistDialogProps {
  readonly sessionId: string;
  readonly onClose: () => void;
}

export function AttachSetlistDialog({ sessionId, onClose }: AttachSetlistDialogProps): JSX.Element {
  const { t } = useTranslation();
  const setlistsQuery = useSetlistsList();
  const linkSetlist = useLinkSetlistToSession();
  const [hasFailed, setHasFailed] = useState(false);

  const candidates = useMemo(
    () => selectSetlistsNotOnSession(setlistsQuery.data?.setlists ?? [], sessionId),
    [setlistsQuery.data, sessionId],
  );

  const attach = (setlist: SetlistSummary): void => {
    setHasFailed(false);
    linkSetlist.mutate(
      { setlist, sessionId },
      { onSuccess: () => onClose(), onError: () => setHasFailed(true) },
    );
  };

  return (
    <dialog
      ref={openDialogOnAttach}
      onClose={onClose}
      className="m-auto w-[calc(100vw-2rem)] sm:w-[28rem] max-w-[28rem] rounded-lg border border-line bg-bg-elev p-0 backdrop:bg-ink-900/40"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="font-display italic text-xl text-ink-900 m-0">
          {t('setlist.attach.title')}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label={t('common.cancel')}
          className="min-w-11"
        >
          ×
        </Button>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {setlistsQuery.isLoading ? (
          <p className="text-ink-400 italic text-sm">{t('common.loading')}</p>
        ) : null}
        {!setlistsQuery.isLoading && candidates.length === 0 ? (
          <p className="text-ink-400 italic text-sm">{t('setlist.attach.empty')}</p>
        ) : null}
        {candidates.map((setlist) => (
          <button
            key={setlist.id}
            type="button"
            onClick={() => attach(setlist)}
            disabled={linkSetlist.isPending}
            className="flex items-center gap-3 text-left border border-line rounded-md px-3 py-2.5 min-h-11 hover:border-line-strong transition-colors cursor-pointer disabled:opacity-60"
          >
            <Icon name="setlist" size={16} className="text-ink-500" />
            <span className="flex-1 min-w-0 truncate text-ink-900">
              {selectSetlistDisplayName(setlist.name, t('setlist.untitled'))}
            </span>
            <span className="text-[12px] text-ink-500">
              {t('setlist.songCount', { count: setlist.songCount })}
            </span>
          </button>
        ))}
        {hasFailed ? (
          <p className="text-danger text-sm" role="alert">
            {t('setlist.failure.attach')}
          </p>
        ) : null}
      </div>
    </dialog>
  );
}
