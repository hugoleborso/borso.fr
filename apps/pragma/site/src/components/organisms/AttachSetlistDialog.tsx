/** @Feature setlists */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type SetlistSummary,
  useLinkSetlistToSession,
  useSetlistsList,
} from '../../lib/queries/setlists.queries';
import { selectSetlistsNotOnSession } from '../../lib/queries/setlists.utils';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { Icon } from '../atoms/Icon';
import { ListRow } from '../molecules/ListRow';
import { Sheet } from '../molecules/Sheet';

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
    <Sheet
      title={t('setlist.attach.title')}
      label={t('setlist.attach.title')}
      isDismissible={false}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        {setlistsQuery.isLoading ? (
          <p className="text-meta text-ink-soft">{t('common.loading')}</p>
        ) : null}
        {!setlistsQuery.isLoading && candidates.length === 0 ? (
          <p className="text-meta text-ink-soft">{t('setlist.attach.empty')}</p>
        ) : null}
        {candidates.map((setlist) => (
          <ListRow
            key={setlist.id}
            onClick={() => attach(setlist)}
            disabled={linkSetlist.isPending}
            leading={<Icon name="setlist" className="text-ink-soft" />}
            className="rounded-md px-3 py-2.5 hover:bg-hover disabled:opacity-60"
          >
            <span className="min-w-0 flex-1 truncate text-ink">
              {selectSetlistDisplayName(setlist.name, t('setlist.untitled'))}
            </span>
            <span className="text-meta text-ink-soft">
              {t('setlist.songCount', { count: setlist.songCount })}
            </span>
          </ListRow>
        ))}
        {hasFailed ? (
          <p className="text-meta text-danger" role="alert">
            {t('setlist.failure.attach')}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
