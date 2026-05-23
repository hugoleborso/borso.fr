/**
 * 100%-coverage gate for the FileDrop validation helpers.
 */

import { describe, expect, it } from 'vitest';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_PDF_MIME,
  FILE_DROP_ACCEPT_ATTRIBUTE,
  FILE_DROP_MAX_BYTES,
  validateChartFile,
} from './file-drop.utils';

function fakeFile(type: string, size: number): File {
  return new File([new Uint8Array(size)], 'sample', { type });
}

describe('validateChartFile', () => {
  it('accepts application/pdf as the pdf kind', () => {
    const result = validateChartFile(fakeFile(ALLOWED_PDF_MIME, 1024));
    expect(result).toEqual({ ok: true, kind: 'pdf' });
  });

  it.each(ALLOWED_IMAGE_MIMES)('accepts %s as the image kind', (mime) => {
    expect(validateChartFile(fakeFile(mime, 1024))).toEqual({ ok: true, kind: 'image' });
  });

  it('rejects an unsupported MIME', () => {
    const result = validateChartFile(fakeFile('image/gif', 1024));
    expect(result).toEqual({ ok: false, reason: 'unsupported-type' });
  });

  it('rejects an empty MIME', () => {
    const result = validateChartFile(fakeFile('', 1024));
    expect(result).toEqual({ ok: false, reason: 'unsupported-type' });
  });

  it('rejects files over the 10 MiB ceiling', () => {
    const result = validateChartFile(fakeFile(ALLOWED_PDF_MIME, FILE_DROP_MAX_BYTES + 1));
    expect(result).toEqual({ ok: false, reason: 'too-large' });
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
