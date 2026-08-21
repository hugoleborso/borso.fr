/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentFrame } from '../atoms/DocumentFrame';
import { HintText } from '../atoms/HintText';
import { PreviewImage } from '../atoms/PreviewImage';

export interface UploadedChartPreviewProps {
  readonly kind: 'pdf' | 'image';
  readonly objectKey: string;
  readonly signedPreviewUrl: string | null;
  readonly errorMessage: string | null;
}

const DOCUMENT_CLASS = 'w-full h-[720px] border border-line rounded-md';

const IMAGE_CLASS = 'max-w-full rounded-md border border-line';

// @FollowsBlueprint molecule-presentational
export function UploadedChartPreview({
  kind,
  objectKey,
  signedPreviewUrl,
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
  if (signedPreviewUrl === null) {
    return <HintText tone="muted">{t('common.loading')}</HintText>;
  }
  if (kind === 'pdf') {
    return <DocumentFrame source={signedPreviewUrl} title={objectKey} className={DOCUMENT_CLASS} />;
  }
  return (
    <PreviewImage source={signedPreviewUrl} alternativeText={objectKey} className={IMAGE_CLASS} />
  );
}
