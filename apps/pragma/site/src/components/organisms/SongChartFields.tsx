/** @Feature songs */

import { SONG_CHARTS_MAX } from '@domain/input-limits.core';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  canAddChartCard,
  moveChartCard,
  type SongChartCardDraft,
  withChartCardAdded,
  withChartCardChanged,
  withoutChartCard,
} from '../../routes/catalog/song-chart-cards.core';
import { Button } from '../atoms/Button';
import { composeClassName } from '../atoms/class-name.utils';
import type { InstrumentToggleOption } from '../molecules/InstrumentToggleGroup';
import { FIELD_LABEL_CLASS } from '../atoms/LabelledField';
import { SongChartCard } from './SongChartCard';

export type SongChartCardsUpdate = (
  current: readonly SongChartCardDraft[],
) => readonly SongChartCardDraft[];

interface SongChartFieldsProps {
  readonly cards: readonly SongChartCardDraft[];
  readonly instruments: readonly InstrumentToggleOption[];
  readonly songId?: string;
  readonly onCardsChange: (update: SongChartCardsUpdate) => void;
  readonly onChordproChange: (cardId: string, text: string) => void;
}

// @FollowsBlueprint organism-presentational
export function SongChartFields(props: SongChartFieldsProps): JSX.Element {
  const { t } = useTranslation();
  const isAddAllowed = canAddChartCard(props.cards.length);
  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-rule p-3">
      <legend className={composeClassName(FIELD_LABEL_CLASS, 'px-2')}>
        {t('catalog.chordCharts')}
      </legend>
      {props.cards.map((card, index) => (
        <SongChartCard
          key={card.cardId}
          card={card}
          index={index}
          cardCount={props.cards.length}
          instruments={props.instruments}
          {...(props.songId === undefined ? {} : { songId: props.songId })}
          onChange={(changes) =>
            props.onCardsChange((current) => withChartCardChanged(current, card.cardId, changes))
          }
          onChordproChange={(text) => props.onChordproChange(card.cardId, text)}
          onMove={(offset) =>
            props.onCardsChange((current) => moveChartCard(current, card.cardId, offset))
          }
          onRemove={() => props.onCardsChange((current) => withoutChartCard(current, card.cardId))}
        />
      ))}
      <Button
        variant="secondary"
        icon="plus"
        className="self-start"
        disabled={!isAddAllowed}
        onClick={() =>
          props.onCardsChange((current) => withChartCardAdded(current, crypto.randomUUID()))
        }
      >
        {t('catalog.chartAdd')}
      </Button>
      {isAddAllowed ? null : (
        <p className="m-0 text-meta text-ink-soft">
          {t('catalog.chartsMaxReached', { max: SONG_CHARTS_MAX })}
        </p>
      )}
    </fieldset>
  );
}
