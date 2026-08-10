/**
 * UploadedChartPreview — renders a chart variant stored in S3 from a
 * short-lived signed GET URL, in an `<iframe>` (PDF) or an `<img>`
 * (image). The URL is signed by the route that renders this preview,
 * so the molecule stays renderable without a query client.
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

export interface UploadedChartPreviewProps {
  readonly kind: 'pdf' | 'image';
  readonly objectKey: string;
  /** Signed GET URL, or `null` while it is still being fetched. */
  readonly previewUrl: string | null;
  readonly errorMessage: string | null;
}

export function UploadedChartPreview({
  kind,
  objectKey,
  previewUrl,
  errorMessage,
}: UploadedChartPreviewProps): JSX.Element {
  const { t } = useTranslation();

  if (errorMessage !== null) {
    return (
      <p className="text-xs text-danger" role="alert">
        {errorMessage}
      </p>
    );
  }
  if (previewUrl === null) {
    return <p className="text-xs text-ink-400 italic">{t('common.loading')}</p>;
  }
  if (kind === 'pdf') {
    return (
      <iframe
        src={previewUrl}
        title={objectKey}
        className="w-full h-[720px] border border-line rounded-md"
      />
    );
  }
  return (
    <img src={previewUrl} alt={objectKey} className="max-w-full rounded-md border border-line" />
  );
}
