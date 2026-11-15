import { describe, expect, it } from 'vitest';
import {
  EMPTY_BAND_LINK_FORM,
  readAddressHost,
  selectBandLinkFormRefusal,
  trimBandLinkFields,
} from './band-link-form.core';

const FOLDER_ADDRESS = 'https://drive.example.com/drive/folders/photos';

// @FollowsBlueprint test-pure-unit
describe('selectBandLinkFormRefusal', () => {
  it('accepts a named https address once trimmed', () => {
    expect(selectBandLinkFormRefusal({ label: ' Photos ', url: ` ${FOLDER_ADDRESS} ` })).toBeNull();
  });

  it('asks for a name before it looks at the address', () => {
    expect(selectBandLinkFormRefusal(EMPTY_BAND_LINK_FORM)).toBe('label-missing');
    expect(selectBandLinkFormRefusal({ label: '   ', url: FOLDER_ADDRESS })).toBe('label-missing');
  });

  it('refuses an address that is not https', () => {
    expect(selectBandLinkFormRefusal({ label: 'Photos', url: 'drive.example.com' })).toBe(
      'url-not-https',
    );
    expect(selectBandLinkFormRefusal({ label: 'Photos', url: 'http://drive.example.com' })).toBe(
      'url-not-https',
    );
  });
});

describe('trimBandLinkFields', () => {
  it('trims both fields', () => {
    expect(trimBandLinkFields({ label: ' Photos ', url: ` ${FOLDER_ADDRESS}\n` })).toStrictEqual({
      label: 'Photos',
      url: FOLDER_ADDRESS,
    });
  });
});

describe('readAddressHost', () => {
  it('reads the host of an address, and keeps text that is not one as it is', () => {
    expect(readAddressHost(FOLDER_ADDRESS)).toBe('drive.example.com');
    expect(readAddressHost('not an address')).toBe('not an address');
  });
});
