import { describe, expect, it } from 'vitest';
import { expiredBarSearchCacheKeys, mapNominatimToBarSearchHits } from './bar-search.core';

const PLACE = {
  place_id: 42,
  name: 'Le Zinc',
  display_name: 'Le Zinc, 3 rue de Paris, Paris, 75011, France',
  address: { city: 'Paris', country: 'France' },
  extratags: { phone: '+33 1 02 03 04 05' },
};

describe('mapNominatimToBarSearchHits', () => {
  it('reads the fields a bar record needs out of a place', () => {
    expect(mapNominatimToBarSearchHits([PLACE])).toEqual([
      {
        placeId: '42',
        name: 'Le Zinc',
        address: 'Le Zinc, 3 rue de Paris, Paris, 75011, France',
        city: 'Paris',
        phone: '+33 1 02 03 04 05',
      },
    ]);
  });

  it('walks the city keys OpenStreetMap uses, in order', () => {
    const townHit = mapNominatimToBarSearchHits([{ ...PLACE, address: { town: 'Bourges' } }]);
    expect(townHit[0]?.city).toBe('Bourges');
    const villageHit = mapNominatimToBarSearchHits([{ ...PLACE, address: { village: 'Oradour' } }]);
    expect(villageHit[0]?.city).toBe('Oradour');
    const municipalityHit = mapNominatimToBarSearchHits([
      { ...PLACE, address: { municipality: 'Lugano' } },
    ]);
    expect(municipalityHit[0]?.city).toBe('Lugano');
  });

  it('prefers the city over the other keys when several are present', () => {
    const hits = mapNominatimToBarSearchHits([
      { ...PLACE, address: { town: 'Bourges', city: 'Paris' } },
    ]);
    expect(hits[0]?.city).toBe('Paris');
  });

  it('has no city when the place carries no address, or none naming one', () => {
    const noAddress = mapNominatimToBarSearchHits([{ place_id: 1, name: 'X', display_name: 'X' }]);
    expect(noAddress[0]?.city).toBeNull();
    const noCityKey = mapNominatimToBarSearchHits([{ ...PLACE, address: { country: 'France' } }]);
    expect(noCityKey[0]?.city).toBeNull();
  });

  it('falls back to the contact phone tag, then to no phone', () => {
    const contactPhone = mapNominatimToBarSearchHits([
      { ...PLACE, extratags: { 'contact:phone': '01 02' } },
    ]);
    expect(contactPhone[0]?.phone).toBe('01 02');
    const noTags = mapNominatimToBarSearchHits([{ ...PLACE, extratags: null }]);
    expect(noTags[0]?.phone).toBeNull();
    const noTagsAtAll = mapNominatimToBarSearchHits([
      { place_id: 2, name: 'X', display_name: 'X' },
    ]);
    expect(noTagsAtAll[0]?.phone).toBeNull();
    const noPhoneTag = mapNominatimToBarSearchHits([{ ...PLACE, extratags: { cuisine: 'bar' } }]);
    expect(noPhoneTag[0]?.phone).toBeNull();
  });

  it('drops a place with no name rather than offering a blank row', () => {
    expect(mapNominatimToBarSearchHits([{ place_id: 3, display_name: 'A street' }])).toEqual([]);
  });

  it('answers an empty list for an empty or unexpected body', () => {
    expect(mapNominatimToBarSearchHits([])).toEqual([]);
    expect(mapNominatimToBarSearchHits({ places: [] })).toEqual([]);
    expect(mapNominatimToBarSearchHits(null)).toEqual([]);
  });
});

function entry(expiresAt: number): { value: never[]; expiresAt: number } {
  return { value: [], expiresAt };
}

describe('expiredBarSearchCacheKeys', () => {
  it('names every key whose entry has reached its expiry', () => {
    const cache = new Map([
      ['stale', entry(100)],
      ['exactly-due', entry(200)],
      ['fresh', entry(300)],
    ]);
    expect(expiredBarSearchCacheKeys(cache, 200)).toEqual(['stale', 'exactly-due']);
  });

  it('names none while every entry is fresh', () => {
    expect(expiredBarSearchCacheKeys(new Map([['fresh', entry(300)]]), 200)).toEqual([]);
  });
});
