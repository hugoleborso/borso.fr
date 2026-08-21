import { describe, expect, it } from 'vitest';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_PDF_MIME,
  FILE_DROP_ACCEPT_ATTRIBUTE,
  FILE_DROP_MAX_BYTES,
  FILE_DROP_MAX_MEBIBYTES,
  selectRejectionMessageKey,
  validateChartFile,
} from './file-drop.utils';

function fakeFile(type: string, size: number): File {
  return new File([new Uint8Array(size)], 'sample', { type });
}

// @FollowsBlueprint test-pure-unit
describe('validateChartFile', () => {
  it('accepts application/pdf as the pdf kind', () => {
    const verdict = validateChartFile(fakeFile(ALLOWED_PDF_MIME, 1024));
    expect(verdict).toEqual({ ok: true, kind: 'pdf', contentType: ALLOWED_PDF_MIME });
  });

  it.each(ALLOWED_IMAGE_MIMES)('accepts %s as the image kind', (mime) => {
    expect(validateChartFile(fakeFile(mime, 1024))).toEqual({
      ok: true,
      kind: 'image',
      contentType: mime,
    });
  });

  it('rejects an unsupported MIME', () => {
    const verdict = validateChartFile(fakeFile('image/gif', 1024));
    expect(verdict).toEqual({ ok: false, reason: 'unsupported-type' });
  });

  it('rejects an empty MIME', () => {
    const verdict = validateChartFile(fakeFile('', 1024));
    expect(verdict).toEqual({ ok: false, reason: 'unsupported-type' });
  });

  it('accepts a file sitting exactly on the ceiling', () => {
    const verdict = validateChartFile(fakeFile(ALLOWED_PDF_MIME, FILE_DROP_MAX_BYTES));
    expect(verdict).toEqual({ ok: true, kind: 'pdf', contentType: ALLOWED_PDF_MIME });
  });

  it('rejects files over the 10 MiB ceiling', () => {
    const verdict = validateChartFile(fakeFile(ALLOWED_PDF_MIME, FILE_DROP_MAX_BYTES + 1));
    expect(verdict).toEqual({ ok: false, reason: 'too-large' });
  });
});

describe('selectRejectionMessageKey', () => {
  it('names the message for each rejection reason', () => {
    expect(selectRejectionMessageKey('too-large')).toBe('catalog.uploadTooLarge');
    expect(selectRejectionMessageKey('unsupported-type')).toBe('catalog.uploadUnsupported');
  });
});

describe('FILE_DROP_MAX_MEBIBYTES', () => {
  it('states the ceiling in the unit the message interpolates', () => {
    expect(FILE_DROP_MAX_MEBIBYTES).toBe(FILE_DROP_MAX_BYTES / (1024 * 1024));
  });
});

describe('FILE_DROP_ACCEPT_ATTRIBUTE', () => {
  it('lists pdf and every allowed image MIME', () => {
    expect(FILE_DROP_ACCEPT_ATTRIBUTE).toContain(ALLOWED_PDF_MIME);
    for (const mime of ALLOWED_IMAGE_MIMES) {
      expect(FILE_DROP_ACCEPT_ATTRIBUTE).toContain(mime);
    }
  });
});
