import { describe, expect, it } from 'vitest';
import { ALLOWED_PHOTO_CONTENT_TYPES, fileExtensionForContentType } from './media.core';

describe('ALLOWED_PHOTO_CONTENT_TYPES', () => {
  it('lists exactly the three image types the presigner accepts', () => {
    expect([...ALLOWED_PHOTO_CONTENT_TYPES]).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });
});

describe('fileExtensionForContentType', () => {
  it('shortens image/jpeg to jpg rather than jpeg', () => {
    expect(fileExtensionForContentType('image/jpeg')).toBe('jpg');
  });

  it('keeps the subtype for the other allowed types', () => {
    expect(fileExtensionForContentType('image/png')).toBe('png');
    expect(fileExtensionForContentType('image/webp')).toBe('webp');
  });

  it('falls back to bin for a content type outside the table', () => {
    expect(fileExtensionForContentType('application/pdf')).toBe('bin');
  });
});
