/** @Feature studies */

import type { Lineup } from '@domain/lineup.core';
import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSignedInMember } from '../../lib/queries/me.queries';
import { useLogStudy, useStudiesOverview, useUndoStudy } from '../../lib/queries/studies.queries';
import { selectPractisedState } from '../../routes/catalog/song-page.core';
import { RoundAction } from '../atoms/RoundAction';

export interface SongRoundActionsProps {
  readonly songId: string;
  readonly defaultLineup: Lineup;
  readonly notesAnchor: string;
}

const NO_QUEUE: readonly never[] = [];

// @FollowsBlueprint organism-query-owning
export function SongRoundActions({
  songId,
  defaultLineup,
  notesAnchor,
}: SongRoundActionsProps): JSX.Element {
  const { t } = useTranslation();
  const memberQuery = useSignedInMember();
  const overviewQuery = useStudiesOverview();
  const memberId = memberQuery.data?.memberId ?? null;
  const logStudy = useLogStudy(memberId ?? '');
  const undoStudy = useUndoStudy(memberId ?? '');
  const [practisedHere, setPractisedHere] = useState<boolean | null>(null);
  const practised = selectPractisedState(
    defaultLineup,
    overviewQuery.data?.queue ?? NO_QUEUE,
    songId,
    memberId,
  );
  const isPractised = practisedHere ?? practised.isPractisedToday;
  const canPractise = practised.instrumentIds.length > 0;

  const togglePractised = (): void => {
    const mutation = isPractised ? undoStudy : logStudy;
    setPractisedHere(!isPractised);
    for (const instrumentId of practised.instrumentIds) {
      mutation.mutate({ songId, instrumentId }, { onError: () => setPractisedHere(null) });
    }
  };

  return (
    <div className="flex items-start justify-around gap-2 sm:justify-start sm:gap-6">
      <RoundAction
        kind="button"
        icon="check"
        label={t('catalog.practised')}
        isPressed={isPractised}
        isDisabled={!canPractise}
        onPress={togglePractised}
      />
      <RoundAction
        kind="anchor"
        icon="text"
        label={t('catalog.notesTitle')}
        href={`#${notesAnchor}`}
      />
      <RoundAction
        kind="link"
        icon="expand"
        label={t('catalog.fullScreen')}
        to={`/catalog/${songId}/scene`}
      />
    </div>
  );
}
