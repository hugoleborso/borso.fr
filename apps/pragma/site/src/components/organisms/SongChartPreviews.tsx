/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/api.client';
import type { SongRecord } from '../../lib/queries/songs.queries';
import { useSignedChartUrl } from '../../lib/queries/uploads.queries';
import { selectChordProText } from '../../routes/catalog/chart-kind.utils';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { UploadedChartPreview } from '../molecules/UploadedChartPreview';
import { ChordChartViewer } from './ChordChartViewer';

export interface SongChartPreviewsProps {
  readonly songId: string;
  readonly chart: SongRecord['chart'];
}

// @FollowsBlueprint organism-query-owning
export function SongChartPreviews({ songId, chart }: SongChartPreviewsProps): JSX.Element {
  const { t } = useTranslation();
  const uploadedChart =
    chart !== null && (chart.kind === 'pdf' || chart.kind === 'image') ? chart : null;
  const signedChartUrlQuery = useSignedChartUrl(uploadedChart?.s3Key ?? null);
  const chordProText = selectChordProText(chart);

  return (
    <>
      {chordProText === null ? null : (
        <Card variant="bare">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-bg-sunk">
            <Icon name="text" size={14} className="text-ink-500" />
            <span className="text-xs font-medium">{t('catalog.previewTitle')}</span>
            <span className="flex-1" />
            <Link
              to={`/catalog/${songId}/scene`}
              className="inline-flex items-center gap-1 min-h-11 px-2 -mr-1 rounded-md text-xs text-ink-500 hover:text-ink-900 no-underline"
            >
              <Icon name="play" size={12} />
              {t('catalog.openScene')}
            </Link>
          </div>
          <div className="p-4">
            <ChordChartViewer source={chordProText} compact />
          </div>
        </Card>
      )}

      {uploadedChart === null ? null : (
        <Card variant="bare">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-bg-sunk">
            <Icon
              name={uploadedChart.kind === 'pdf' ? 'pdf' : 'image'}
              size={14}
              className="text-ink-500"
            />
            <span className="text-xs font-medium">{t('catalog.previewTitle')}</span>
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
