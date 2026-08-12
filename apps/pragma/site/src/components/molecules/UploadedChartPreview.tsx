/**
 * UploadedChartPreview — renders a chart variant stored in S3 from a
 * short-lived signed GET URL, in an `<iframe>` (PDF) or an `<img>`
 * (image). The URL is signed by the route that renders this preview,
 * so the molecule stays renderable without a query client.
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentFrame } from '../atoms/DocumentFrame';
import { HintText } from '../atoms/HintText';
import { PreviewImage } from '../atoms/PreviewImage';

export interface UploadedChartPreviewProps {
  readonly kind: 'pdf' | 'image';
  readonly objectKey: string;
  /** Signed GET URL, or `null` while it is still being fetched. */
  readonly previewUrl: string | null;
  readonly errorMessage: string | null;
}

const DOCUMENT_CLASS = 'w-full h-[720px] border border-line rounded-md';

const IMAGE_CLASS = 'max-w-full rounded-md border border-line';

// @FollowsBlueprint molecule-presentational
export function UploadedChartPreview({
  kind,
  objectKey,
  previewUrl,
  errorMessage,
}: UploadedChartPreviewProps): JSX.Element {
  const { t } = useTranslation();

  if (errorMessage !== null) {
    return (
      <HintText tone="danger" role="alert">
        {errorMessage}
      </HintText>
    );
  }
  if (previewUrl === null) {
    return <HintText tone="muted">{t('common.loading')}</HintText>;
  }
  if (kind === 'pdf') {
    return <DocumentFrame source={previewUrl} title={objectKey} className={DOCUMENT_CLASS} />;
  }
  return <PreviewImage source={previewUrl} alternativeText={objectKey} className={IMAGE_CLASS} />;
}
