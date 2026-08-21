/** @Feature uploads */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api.client';
import { useSignChartUpload } from '../../lib/queries/uploads.queries';
import { composeClassName } from '../atoms/class-name.utils';
import {
  FILE_DROP_MAX_MEBIBYTES,
  type FileDropChartKind,
  selectRejectionMessageKey,
  validateChartFile,
} from '../molecules/file-drop.utils';
import { FileDropZone } from '../molecules/FileDropZone';
import { hasSentFileToPresignedUrl } from '../../lib/object-upload.adapter';

export interface FileDropResult {
  readonly kind: FileDropChartKind;
  readonly objectKey: string;
}

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
  const sign = useSignChartUpload();
  const [error, setError] = useState<string | null>(null);

  const uploadChartFile = async (file: File): Promise<void> => {
    setError(null);
    const validated = validateChartFile(file);
    if (!validated.ok) {
      setError(t(selectRejectionMessageKey(validated.reason), { maxMb: FILE_DROP_MAX_MEBIBYTES }));
      return;
    }
    try {
      const signed = await sign.mutateAsync({
        contentType: validated.contentType,
        contentLength: file.size,
        ...(songId === undefined ? {} : { songId }),
      });
      const hasSent = await hasSentFileToPresignedUrl(signed.uploadUrl, file);
      if (!hasSent) {
        setError(t('catalog.uploadFailed'));
        return;
      }
      onUploaded({ kind: validated.kind, objectKey: signed.objectKey });
    } catch (error_) {
      setError(error_ instanceof ApiError ? error_.message : t('catalog.uploadFailed'));
    }
  };

  return (
    <div className={composeClassName('flex flex-col gap-2', className)}>
      <FileDropZone isBusy={sign.isPending} onFileChosen={(file) => void uploadChartFile(file)} />
      {currentObjectKey !== undefined && currentObjectKey.length > 0 ? (
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <span className="truncate">
            {t('catalog.uploadCurrent')}: <span className="font-mono">{currentObjectKey}</span>
          </span>
          {onRemoved === undefined ? null : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                onRemoved();
              }}
              className="text-ink-500 hover:text-accent text-sm underline-offset-2 hover:underline"
            >
              {t('fileDrop.remove')}
            </button>
          )}
        </div>
      ) : null}
      {error === null ? null : (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
