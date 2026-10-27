/** @Feature setlists */

import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type SetlistSummary,
  useUnlinkSetlistFromSession,
} from '../../lib/queries/setlists.queries';
import { Button } from '../atoms/Button';
import { SetlistSummaryRow } from '../molecules/SetlistSummaryRow';
import { AttachSetlistDialog } from './AttachSetlistDialog';
import { CreateSetlistDialog } from './CreateSetlistDialog';

interface SessionSetlistsProps {
  readonly sessionId: string;
  readonly setlists: readonly SetlistSummary[];
  readonly isLoading: boolean;
}

export function SessionSetlists({
  sessionId,
  setlists,
  isLoading,
}: SessionSetlistsProps): JSX.Element {
  const { t } = useTranslation();
  const unlinkSetlist = useUnlinkSetlistFromSession();
  const [isCreating, setIsCreating] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);

  if (isLoading) {
    return <p className="text-ink-soft italic text-meta">{t('common.loading')}</p>;
  }

  return (
    <>
      {setlists.length === 0 ? (
        <p className="text-ink-soft italic text-meta">{t('sessions.noSetlists')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {setlists.map((setlist) => (
            <li key={setlist.id}>
              <SetlistSummaryRow
                id={setlist.id}
                name={setlist.name}
                isVoting={setlist.status === 'voting'}
                songCount={setlist.songCount}
                sessionsLabel={null}
                action={
                  <Button
                    icon="unlink"
                    variant="quiet"
                    size="sm"
                    aria-label={t('setlist.detach.aria')}
                    disabled={unlinkSetlist.isPending}
                    onClick={() => unlinkSetlist.mutate({ setlistId: setlist.id, sessionId })}
                  >
                    {t('setlist.detach.button')}
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 items-start">
        <Button variant="primary" onClick={() => setIsCreating(true)} icon="plus">
          {t('setlist.new')}
        </Button>
        <Button variant="secondary" onClick={() => setIsAttaching(true)} icon="setlist">
          {t('setlist.attach.button')}
        </Button>
      </div>

      {unlinkSetlist.isError ? (
        <p className="text-danger text-meta" role="alert">
          {t('setlist.failure.detach')}
        </p>
      ) : null}

      {isCreating ? (
        <CreateSetlistDialog
          sessionId={sessionId}
          suggestedName={t('setlist.create.defaultName', { index: setlists.length + 1 })}
          onClose={() => setIsCreating(false)}
          onCreated={() => setIsCreating(false)}
        />
      ) : null}
      {isAttaching ? (
        <AttachSetlistDialog sessionId={sessionId} onClose={() => setIsAttaching(false)} />
      ) : null}
    </>
  );
}
