/** @Feature uploads */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { composeClassName } from '../atoms/class-name.utils';
import { Button } from '../atoms/Button';
import { FileDropZone } from '../molecules/FileDropZone';
import { type ChartUploadResult, useChartUpload } from './chart-upload.hook';

export type FileDropResult = ChartUploadResult;

export interface FileDropProps {
  readonly songId?: string;
  readonly currentObjectKey?: string;
  readonly onUploaded: (result: FileDropResult) => void;
  readonly onRemoved?: () => void;
  readonly className?: string;
}

// @FollowsBlueprint organism-query-owning
export function FileDrop({
  songId,
  currentObjectKey,
  onUploaded,
  onRemoved,
  className,
}: FileDropProps): JSX.Element {
  const { t } = useTranslation();
  const chartUpload = useChartUpload(songId);

  const uploadChartFile = async (file: File): Promise<void> => {
    const uploaded = await chartUpload.upload(file);
    if (uploaded !== null) onUploaded(uploaded);
  };

  return (
    <div className={composeClassName('flex flex-col gap-2', className)}>
      <FileDropZone
        isBusy={chartUpload.isBusy}
        onFileChosen={(file) => void uploadChartFile(file)}
      />
      {currentObjectKey !== undefined && currentObjectKey.length > 0 ? (
        <div className="flex items-center gap-2 text-meta text-ink-soft">
          <span className="truncate">
            {t('catalog.uploadCurrent')}: <span className="font-mono">{currentObjectKey}</span>
          </span>
          {onRemoved === undefined ? null : (
            <Button
              icon="trash"
              variant="quiet"
              size="sm"
              onClick={() => {
                chartUpload.clearError();
                onRemoved();
              }}
            >
              {t('fileDrop.remove')}
            </Button>
          )}
        </div>
      ) : null}
      {chartUpload.error === null ? null : (
        <p className="text-meta text-danger" role="alert">
          {chartUpload.error}
        </p>
      )}
    </div>
  );
}
