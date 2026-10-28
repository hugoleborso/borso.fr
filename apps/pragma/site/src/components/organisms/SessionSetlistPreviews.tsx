/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type SetlistSummary,
  useUnlinkSetlistFromSession,
} from '../../lib/queries/setlists.queries';
import { EmptyState } from '../molecules/EmptyState';
import { SessionSetlistPreview } from './SessionSetlistPreview';

export interface SessionSetlistPreviewsProps {
  readonly sessionId: string;
  readonly setlists: readonly SetlistSummary[];
  readonly isLoading: boolean;
  readonly isEmpty: boolean;
}

// @FollowsBlueprint organism-query-owning
export function SessionSetlistPreviews({
  sessionId,
  setlists,
  isLoading,
  isEmpty,
}: SessionSetlistPreviewsProps): JSX.Element {
  const { t } = useTranslation();
  const unlinkSetlist = useUnlinkSetlistFromSession();
  return (
    <>
      {unlinkSetlist.isError ? (
        <p className="m-0 text-meta text-danger" role="alert">
          {t('setlist.failure.detach')}
        </p>
      ) : null}
      {isLoading ? (
        <p className="m-0 text-meta text-ink-soft italic">{t('common.loading')}</p>
      ) : null}
      {isEmpty ? <EmptyState icon="setlist">{t('sessions.noSetlists')}</EmptyState> : null}
      {setlists.map((setlist) => (
        <SessionSetlistPreview
          key={setlist.id}
          setlistId={setlist.id}
          setlistName={setlist.name}
          menuItems={[
            {
              label: t('setlist.detach.button'),
              icon: 'unlink',
              tone: 'default',
              onSelect: () => unlinkSetlist.mutate({ setlistId: setlist.id, sessionId }),
            },
          ]}
        />
      ))}
    </>
  );
}
