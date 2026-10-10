export const CHART_PDF_CONTENT_TYPE = 'application/pdf';

export const CHART_IMAGE_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
] as const;

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  CHART_PDF_CONTENT_TYPE,
  ...CHART_IMAGE_CONTENT_TYPES,
] as const;

export type AllowedUploadContentType = (typeof ALLOWED_UPLOAD_CONTENT_TYPES)[number];
