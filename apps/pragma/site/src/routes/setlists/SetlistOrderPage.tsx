/** @Feature setlists */

import { type JSX, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { BottomActions } from '../../components/atoms/BottomActions';
import { Button } from '../../components/atoms/Button';
import { ButtonLink } from '../../components/atoms/ButtonLink';
import { EmptyState } from '../../components/molecules/EmptyState';
import { NotFoundNotice } from '../../components/molecules/NotFoundNotice';
import { PageHeader } from '../../components/molecules/PageHeader';
import { type OrderRow, SetlistOrderList } from '../../components/organisms/SetlistOrderList';
import { useReorderSetlist, useSetlistEntries } from '../../lib/queries/setlist-entries.queries';
import { useSetlist } from '../../lib/queries/setlists.queries';
import { useSongsList } from '../../lib/queries/songs.queries';
import { selectSetlistDisplayName } from '../../lib/setlist-name.utils';
import { useCopySetlistOrder } from './copy-setlist-order.hook';

const NO_ROWS: readonly never[] = [];
const SONG_ID_FALLBACK_LENGTH = 8;

// @FollowsBlueprint route-detail-page
export function SetlistOrderPage(): JSX.Element {
  const { setlistId } = useParams<{ setlistId: string }>();
  const { t } = useTranslation();
  if (setlistId === undefined) {
    return <p className="px-4 py-4 text-danger sm:px-9 sm:py-7">{t('setlist.missingId')}</p>;
  }
  return <SetlistOrder setlistId={setlistId} />;
}

function SetlistOrder({ setlistId }: { setlistId: string }): JSX.Element {
  const { t } = useTranslation();
  const setlistQuery = useSetlist(setlistId);
  const entriesQuery = useSetlistEntries(setlistId);
  const songsQuery = useSongsList();
  const reorder = useReorderSetlist();
  const [hasReorderFailed, setHasReorderFailed] = useState(false);
  const setlistEntries = entriesQuery.data?.entries ?? NO_ROWS;
  const songsById = useMemo(
    () => Object.fromEntries((songsQuery.data?.songs ?? NO_ROWS).map((song) => [song.id, song])),
    [songsQuery.data],
  );
  const copyOrder = useCopySetlistOrder(setlistEntries, songsById);
  const setlist = setlistQuery.data?.setlist ?? null;

  if (setlistQuery.isLoading || entriesQuery.isLoading) {
    return (
      <p className="px-4 py-4 text-meta text-ink-soft italic sm:px-9 sm:py-7">
        {t('common.loading')}
      </p>
    );
  }
  if (setlist === null) {
    return (
      <NotFoundNotice
        message={t('setlist.notFound')}
        backTo="/setlists"
        backLabel={t('setlist.title')}
      />
    );
  }

  const displayedName = selectSetlistDisplayName(setlist.name, t('setlist.untitled'));
  const setlistPath = `/setlists/${setlistId}`;
  const rows: OrderRow[] = setlistEntries.map((entry) => {
    const song = songsById[entry.songId];
    return {
      id: entry.id,
      title: song?.title ?? entry.songId.slice(0, SONG_ID_FALLBACK_LENGTH),
      durationSeconds: song?.durationSeconds ?? null,
      entryEnergy: entry.energy,
      songEnergy: song?.baseEnergy ?? null,
    };
  });

  return (
    <section className="flex max-w-[960px] flex-col px-4 pt-1 pb-4 sm:px-9 sm:py-7">
      <PageHeader
        back={{ to: setlistPath, label: displayedName }}
        title={t('setlist.orderTitle')}
        className="mb-2 sm:mb-4"
      />
      {hasReorderFailed ? (
        <p
          className="m-0 mb-2 rounded-md bg-danger-soft px-3 py-2 text-meta text-danger"
          role="alert"
        >
          {t('setlist.failure.reorder')}
        </p>
      ) : null}
      {copyOrder.feedback === null ? null : (
        <p
          role={copyOrder.feedback === 'copied' ? 'status' : 'alert'}
          className="m-0 mb-2 text-meta text-ink-soft"
        >
          {copyOrder.feedback === 'copied'
            ? t('setlist.orderCopied')
            : t('setlist.failure.copyOrder')}
        </p>
      )}
      {rows.length === 0 ? (
        <EmptyState icon="setlist">{t('setlist.orderEmpty')}</EmptyState>
      ) : (
        <SetlistOrderList
          rows={rows}
          onReorder={(orderedIds) => {
            setHasReorderFailed(false);
            reorder.mutate(
              { setlistId, entryIds: [...orderedIds] },
              { onError: () => setHasReorderFailed(true) },
            );
          }}
        />
      )}
      <BottomActions>
        <Button variant="secondary" icon="copy" size="lg" onClick={copyOrder.copy}>
          {t('setlist.copyOrder')}
        </Button>
        <ButtonLink to={setlistPath} variant="primary" icon="check" size="lg">
          {t('setlist.orderDone')}
        </ButtonLink>
      </BottomActions>
    </section>
  );
}
