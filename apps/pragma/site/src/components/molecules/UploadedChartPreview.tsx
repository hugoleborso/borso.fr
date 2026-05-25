/**
 * UploadedChartPreview — renders a chart variant stored in S3 by asking
 * the API for a short-lived signed GET URL and feeding it to an
 * `<iframe>` (PDF) or `<img>` (image). The signed URL never reaches
 * the browser cache layer beyond its 5-min validity window — we set
 * the query's `gcTime` and `staleTime` shorter than the URL's actual
 * expiry, so TanStack Query refetches before the URL goes stale.
 */

import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, api } from '../../lib/api';

const SIGNED_URL_STALE_MS = 4 * 60 * 1000;
const SIGNED_URL_GC_MS = 5 * 60 * 1000;

export interface UploadedChartPreviewProps {
  readonly kind: 'pdf' | 'image';
  readonly objectKey: string;
  readonly className?: string;
}

export function UploadedChartPreview({
  kind,
  objectKey,
  className,
}: UploadedChartPreviewProps): JSX.Element {
  const { t } = useTranslation();
  const signed = useQuery({
    queryKey: ['uploads', 'sign-get', objectKey],
    queryFn: async () => {
      const response = await api.api.uploads['sign-get'].$post({ json: { objectKey } });
      if (!response.ok) throw new ApiError(response.status, `sign-get ${response.status}`, null);
      return response.json();
    },
    staleTime: SIGNED_URL_STALE_MS,
    gcTime: SIGNED_URL_GC_MS,
  });

  if (signed.error instanceof ApiError) {
    return (
      <p className="text-xs text-danger" role="alert">
        {signed.error.message}
      </p>
    );
  }
  if (signed.data === undefined) {
    return <p className="text-xs text-ink-400 italic">{t('common.loading')}</p>;
  }
  if (kind === 'pdf') {
    return (
      <iframe
        src={signed.data.getUrl}
        title={objectKey}
        className={`w-full h-[720px] border border-line rounded-md ${className ?? ''}`}
      />
    );
  }
  return (
    <img
      src={signed.data.getUrl}
      alt={objectKey}
      className={`max-w-full rounded-md border border-line ${className ?? ''}`}
    />
  );
}
