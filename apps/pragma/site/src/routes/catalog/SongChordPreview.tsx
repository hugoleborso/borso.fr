/**
 * Inline ChordPro preview Card surfaced above the song edit form
 * when the active chart kind is `chordpro` and the text is non-empty.
 * Pulled out of SongEditForm so the parent stays under the file-line
 * cap.
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/atoms/Card';
import { Icon } from '../../components/atoms/Icon';
import { ChordChartViewer } from '../../components/organisms/ChordChartViewer';

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
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-bg-sunk">
        <Icon name="text" size={14} className="text-ink-500" />
        <span className="text-xs font-medium">{t('catalog.previewTitle')}</span>
      </div>
      <div className="p-4">
        <ChordChartViewer source={chordproText} compact />
      </div>
    </Card>
  );
}
