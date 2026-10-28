/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { convertChordsAboveLyrics } from '../../routes/catalog/chords-above-lyrics.core';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { ChordChartViewer } from './ChordChartViewer';

interface SongChordPreviewProps {
  readonly chordText: string;
}

// @FollowsBlueprint organism-presentational
export function SongChordPreview({ chordText }: SongChordPreviewProps): JSX.Element | null {
  const { t } = useTranslation();
  if (chordText.trim().length === 0) return null;
  const conversion = convertChordsAboveLyrics(chordText);
  return (
    <Card variant="bare">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-rule bg-sunk">
        <Icon name="text" size="sm" className="text-ink-soft" />
        <span className="text-meta font-medium">{t('catalog.previewTitle')}</span>
      </div>
      {conversion.hasChords ? null : (
        <p className="m-0 px-4 pt-3 text-meta text-ink-soft">{t('catalog.chordsNoChords')}</p>
      )}
      <div className="p-4">
        <ChordChartViewer source={conversion.chordPro} compact />
      </div>
    </Card>
  );
}
