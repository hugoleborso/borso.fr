import { describe, expect, it } from 'vitest';
import {
  readBibNumber,
  readPhotoContentType,
  runnerFormValuesSchema,
  selectPhotoRejection,
  slugifyRunnerName,
} from './runner-form.core';

const MEGABYTE = 1024 * 1024;

describe('slugifyRunnerName', () => {
  it('lowercases and joins words with a dash', () => {
    expect(slugifyRunnerName('Alice Martin')).toBe('alice-martin');
  });

  it('strips accents', () => {
    expect(slugifyRunnerName('Hélène Côté')).toBe('helene-cote');
  });

  it('drops punctuation and collapses runs of separators', () => {
    expect(slugifyRunnerName("Jean-Luc  d'Arc")).toBe('jean-luc-d-arc');
  });

  it('trims dashes from both ends', () => {
    expect(slugifyRunnerName('  Bob!  ')).toBe('bob');
  });
});

describe('readBibNumber', () => {
  it('parses a padded numeric string', () => {
    expect(readBibNumber(' 007 ')).toBe(7);
  });

  it('returns not a number for a blank entry', () => {
    expect(Number.isNaN(readBibNumber(''))).toBe(true);
  });
});

describe('runnerFormValuesSchema', () => {
  it('accepts a name and a bib inside the allowed range', () => {
    expect(runnerFormValuesSchema.safeParse({ displayName: 'Alice', bib: '12' }).success).toBe(
      true,
    );
  });

  it('rejects a name shorter than two characters', () => {
    expect(runnerFormValuesSchema.safeParse({ displayName: 'A', bib: '12' }).success).toBe(false);
  });

  it('rejects a bib that is not a number', () => {
    expect(runnerFormValuesSchema.safeParse({ displayName: 'Alice', bib: 'abc' }).success).toBe(
      false,
    );
  });

  it('accepts a bib of exactly one', () => {
    expect(runnerFormValuesSchema.safeParse({ displayName: 'Alice', bib: '1' }).success).toBe(true);
  });

  it('accepts a bib of exactly nine thousand nine hundred and ninety nine', () => {
    expect(runnerFormValuesSchema.safeParse({ displayName: 'Alice', bib: '9999' }).success).toBe(
      true,
    );
  });

  it('rejects a bib of zero', () => {
    expect(runnerFormValuesSchema.safeParse({ displayName: 'Alice', bib: '0' }).success).toBe(
      false,
    );
  });

  it('rejects a bib above the ceiling', () => {
    expect(runnerFormValuesSchema.safeParse({ displayName: 'Alice', bib: '10000' }).success).toBe(
      false,
    );
  });
});

describe('selectPhotoRejection', () => {
  it('accepts a small JPEG', () => {
    expect(selectPhotoRejection({ contentType: 'image/jpeg', sizeBytes: MEGABYTE })).toBeNull();
  });

  it('refuses a format the API does not accept', () => {
    expect(selectPhotoRejection({ contentType: 'image/gif', sizeBytes: 10 })).toBe(
      'unsupported-type',
    );
  });

  it('refuses a photo above five megabytes', () => {
    expect(selectPhotoRejection({ contentType: 'image/png', sizeBytes: 6 * MEGABYTE })).toBe(
      'too-large',
    );
  });

  it('accepts a photo of exactly five megabytes', () => {
    expect(selectPhotoRejection({ contentType: 'image/webp', sizeBytes: 5 * MEGABYTE })).toBeNull();
  });
});

describe('readPhotoContentType', () => {
  it('returns the accepted type unchanged', () => {
    expect(readPhotoContentType('image/png')).toBe('image/png');
  });

  it('returns null for anything else', () => {
    expect(readPhotoContentType('application/pdf')).toBeNull();
  });
});
