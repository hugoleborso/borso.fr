import { describe, expect, it } from 'vitest';
import { selectApiBase } from './api-base.core';

// @FollowsBlueprint test-pure-unit
describe('selectApiBase', () => {
  it('reaches the API on the same origin when the build names no base', () => {
    expect(selectApiBase(undefined)).toBe('/');
    expect(selectApiBase('')).toBe('/');
  });

  it('drops the trailing slash of the preview API host', () => {
    expect(selectApiBase('https://borsouvertures-pr-7-api.preview.borso.fr/')).toBe(
      'https://borsouvertures-pr-7-api.preview.borso.fr',
    );
    expect(selectApiBase('https://api.example')).toBe('https://api.example');
  });
});
