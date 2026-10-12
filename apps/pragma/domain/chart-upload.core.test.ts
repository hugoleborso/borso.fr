import { describe, expect, it } from 'vitest';
import {
  ALLOWED_UPLOAD_CONTENT_TYPES,
  CHART_IMAGE_CONTENT_TYPES,
  CHART_PDF_CONTENT_TYPE,
} from './chart-upload.core';

// @FollowsBlueprint test-pure-unit
describe('ALLOWED_UPLOAD_CONTENT_TYPES', () => {
  it('accepts the PDF and every image a chart can be', () => {
    expect(ALLOWED_UPLOAD_CONTENT_TYPES).toEqual([
      CHART_PDF_CONTENT_TYPE,
      ...CHART_IMAGE_CONTENT_TYPES,
    ]);
  });
});
