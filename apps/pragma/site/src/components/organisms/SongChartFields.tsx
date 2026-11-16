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

interface SongChartFieldsProps {
  readonly cards: readonly SongChartCardDraft[];
  readonly instruments: readonly InstrumentToggleOption[];
  readonly songId?: string;
  readonly onCardsChange: (cards: readonly SongChartCardDraft[]) => void;
  readonly onChordproChange: (index: number, text: string) => void;
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
          key={index}
          card={card}
          index={index}
          cardCount={props.cards.length}
          instruments={props.instruments}
          {...(props.songId === undefined ? {} : { songId: props.songId })}
          onChange={(changes) =>
            props.onCardsChange(withChartCardChanged(props.cards, index, changes))
          }
          onChordproChange={(text) => props.onChordproChange(index, text)}
          onMove={(offset) => props.onCardsChange(moveChartCard(props.cards, index, offset))}
          onRemove={() => props.onCardsChange(withoutChartCard(props.cards, index))}
        />
      ))}
      <Button
        variant="secondary"
        icon="plus"
        className="self-start"
        disabled={!isAddAllowed}
        onClick={() => props.onCardsChange(withChartCardAdded(props.cards))}
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
