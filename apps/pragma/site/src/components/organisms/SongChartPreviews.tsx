/** @Feature songs */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api.client';
import type { SongRecord } from '../../lib/queries/songs.queries';
import { useSignedChartUrl } from '../../lib/queries/uploads.queries';
import { selectChordProText } from '../../routes/catalog/chart-kind.utils';
import { type ChartSwitchSurface, useChartSwitch } from '../../routes/catalog/chart-switch.hook';
import type { NamedInstrument } from '../../routes/catalog/chart-title.utils';
import { clampSemitoneOffset } from '../../routes/catalog/scene-view.core';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { EmptyState } from '../molecules/EmptyState';
import { TransposeStepper } from '../molecules/TransposeStepper';
import { UploadedChartPreview } from '../molecules/UploadedChartPreview';
import { ChordChartSwitcher } from './ChordChartSwitcher';
import { ChordChartViewer } from './ChordChartViewer';

type SongChart = SongRecord['charts'][number];

export interface SongChartPreviewsProps {
  readonly charts: readonly SongChart[];
  readonly instruments: readonly NamedInstrument[];
  readonly heldInstrumentIds: readonly string[] | null;
  readonly surface: ChartSwitchSurface;
}

// @FollowsBlueprint organism-query-owning
export function SongChartPreviews({
  charts,
  instruments,
  heldInstrumentIds,
  surface,
}: SongChartPreviewsProps): JSX.Element {
  const { t } = useTranslation();
  const chartSwitch = useChartSwitch(charts, heldInstrumentIds, surface);
  const shownChart = charts[chartSwitch.shownIndex];
  if (shownChart === undefined) {
    return <EmptyState icon="text">{t('catalog.noChordChart')}</EmptyState>;
  }
  return (
    <>
      <ChordChartSwitcher
        charts={charts}
        instruments={instruments}
        shownIndex={chartSwitch.shownIndex}
        onPick={chartSwitch.pick}
      />
      <ChartPreviewCards chart={shownChart} />
    </>
  );
}

interface ChartPreviewCardsProps {
  readonly chart: SongChart;
}

// @FollowsBlueprint organism-query-owning
function ChartPreviewCards({ chart }: ChartPreviewCardsProps): JSX.Element {
  const { t } = useTranslation();
  const [semitones, setSemitones] = useState(0);
  const uploadedChart = chart.kind === 'pdf' || chart.kind === 'image' ? chart : null;
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
