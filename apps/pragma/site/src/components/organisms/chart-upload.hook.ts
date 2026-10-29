/** @Feature uploads */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api.client';
import { hasSentFileToPresignedUrl } from '../../lib/object-upload.adapter';
import { useSignChartUpload } from '../../lib/queries/uploads.queries';
import {
  FILE_DROP_MAX_MEBIBYTES,
  type FileDropChartKind,
  selectRejectionMessageKey,
  validateChartFile,
} from '../molecules/file-drop.utils';

export interface ChartUploadResult {
  readonly kind: FileDropChartKind;
  readonly objectKey: string;
}

export interface ChartUploadController {
  readonly isBusy: boolean;
  readonly error: string | null;
  readonly upload: (file: File) => Promise<ChartUploadResult | null>;
  readonly clearError: () => void;
}

// @FollowsBlueprint hook-timer-owned-by-handlers
export function useChartUpload(songId: string | undefined): ChartUploadController {
  const { t } = useTranslation();
  const sign = useSignChartUpload();
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<ChartUploadResult | null> => {
    setError(null);
    const validated = validateChartFile(file);
    if (!validated.ok) {
      setError(t(selectRejectionMessageKey(validated.reason), { maxMb: FILE_DROP_MAX_MEBIBYTES }));
      return null;
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
        return null;
      }
      return { kind: validated.kind, objectKey: signed.objectKey };
    } catch (uploadError) {
      setError(uploadError instanceof ApiError ? uploadError.message : t('catalog.uploadFailed'));
      return null;
    }
  };

  return { isBusy: sign.isPending, error, upload, clearError: () => setError(null) };
}
