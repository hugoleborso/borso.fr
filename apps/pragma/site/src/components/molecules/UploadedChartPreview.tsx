/**
 * UploadedChartPreview — renders a chart variant stored in S3 by asking
 * the API for a short-lived signed GET URL and feeding it to an
 * `<iframe>` (PDF) or `<img>` (image). The signed URL never reaches
 * the browser cache layer beyond its 5-min validity window.
 */

import { useEffect, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../lib/api-client';

const signedGetResponseSchema = z.object({
  getUrl: z.string().url(),
  expiresAt: z.string(),
});

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
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSignedUrl(null);
    setError(null);
    apiRequest('/api/uploads/sign-get', { method: 'POST', body: { objectKey } })
      .then((payload) => signedGetResponseSchema.parse(payload))
      .then((parsed) => {
        if (cancelled) return;
        setSignedUrl(parsed.getUrl);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof ApiError ? caught.message : 'sign-get-failed');
      });
    return () => {
      cancelled = true;
    };
  }, [objectKey]);

  if (error !== null) {
    return (
      <p className="text-xs text-danger" role="alert">
        {error}
      </p>
    );
  }
  if (signedUrl === null) {
    return <p className="text-xs text-ink-400 italic">{t('common.loading')}</p>;
  }
  if (kind === 'pdf') {
    return (
      <iframe
        src={signedUrl}
        title={objectKey}
        className={`w-full h-[720px] border border-line rounded-md ${className ?? ''}`}
      />
    );
  }
  return (
    <img
      src={signedUrl}
      alt={objectKey}
      className={`max-w-full rounded-md border border-line ${className ?? ''}`}
    />
  );
}
