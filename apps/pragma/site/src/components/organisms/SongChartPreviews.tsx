/** @Feature songs */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api.client';
import type { SongRecord } from '../../lib/queries/songs.queries';
import { useSignedChartUrl } from '../../lib/queries/uploads.queries';
import { selectChordProText } from '../../routes/catalog/chart-kind.utils';
import { clampSemitoneOffset } from '../../routes/catalog/scene-view.core';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { TransposeStepper } from '../molecules/TransposeStepper';
import { UploadedChartPreview } from '../molecules/UploadedChartPreview';
import { ChordChartViewer } from './ChordChartViewer';

export interface SongChartPreviewsProps {
  readonly chart: SongRecord['chart'];
}

// @FollowsBlueprint organism-query-owning
export function SongChartPreviews({ chart }: SongChartPreviewsProps): JSX.Element {
  const { t } = useTranslation();
  const [semitones, setSemitones] = useState(0);
  const uploadedChart =
    chart !== null && (chart.kind === 'pdf' || chart.kind === 'image') ? chart : null;
  const signedChartUrlQuery = useSignedChartUrl(uploadedChart?.s3Key ?? null);
  const chordProText = selectChordProText(chart);

  return (
    <>
      {chordProText === null ? null : (
        <Card variant="bare">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-rule bg-sunk">
            <Icon name="text" size="sm" className="text-ink-soft" />
            <span className="text-meta font-medium">{t('catalog.previewTitle')}</span>
            <span className="flex-1" />
            <TransposeStepper
              semitones={semitones}
              onTransposeBy={(delta) => setSemitones(clampSemitoneOffset(semitones + delta))}
            />
          </div>
          <div className="p-4">
            <ChordChartViewer source={chordProText} semitones={semitones} compact />
          </div>
        </Card>
      )}

      {uploadedChart === null ? null : (
        <Card variant="bare">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-rule bg-sunk">
            <Icon
              name={uploadedChart.kind === 'pdf' ? 'pdf' : 'image'}
              size="sm"
              className="text-ink-soft"
            />
            <span className="text-meta font-medium">{t('catalog.previewTitle')}</span>
          </div>
          <div className="p-4">
            <UploadedChartPreview
              kind={uploadedChart.kind}
              objectKey={uploadedChart.s3Key}
              signedPreviewUrl={signedChartUrlQuery.data?.getUrl ?? null}
              errorMessage={
                signedChartUrlQuery.error instanceof ApiError
                  ? signedChartUrlQuery.error.message
                  : null
              }
            />
          </div>
        </Card>
      )}
    </>
  );
}
