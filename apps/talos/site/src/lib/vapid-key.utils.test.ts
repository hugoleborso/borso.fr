import { describe, expect, it } from 'vitest';
import { decodeBase64Url } from './vapid-key.utils';

describe('decodeBase64Url', () => {
  it('decodes an unpadded URL-safe key', () => {
    expect([...decodeBase64Url('-_8')]).toEqual([251, 255]);
  });

  it('decodes a key that needs two padding characters', () => {
    expect([...decodeBase64Url('AQ')]).toEqual([1]);
  });

  it('decodes a key whose length is already a multiple of four', () => {
    expect([...decodeBase64Url('AQID')]).toEqual([1, 2, 3]);
  });

  it('decodes a key that needs one padding character', () => {
    expect([...decodeBase64Url('AQI')]).toEqual([1, 2]);
  });
});
