/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { ChordChartViewer } from './ChordChartViewer';

interface SongChordPreviewProps {
  readonly chartKind: string;
  readonly chordproText: string;
}

// @FollowsBlueprint organism-presentational
export function SongChordPreview({
  chartKind,
  chordproText,
}: SongChordPreviewProps): JSX.Element | null {
  const { t } = useTranslation();
  if (chartKind !== 'chordpro' || chordproText.length === 0) return null;
  return (
    <Card variant="bare">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-rule bg-sunk">
        <Icon name="text" size="sm" className="text-ink-soft" />
        <span className="text-meta font-medium">{t('catalog.previewTitle')}</span>
      </div>
      {/* eslint-disable-next-line borso/no-vertical-scroll-container -- the ChordPro preview sits beside the text it renders and keeps a bounded height until slice 6 replaces the editor with chords above lyrics */}
      <div className="p-4 max-h-[55vh] overflow-y-auto">
        <ChordChartViewer source={chordproText} compact />
      </div>
    </Card>
  );
}
