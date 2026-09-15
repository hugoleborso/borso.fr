import { describe, expect, it } from 'vitest';
import { mapPlacesToBarSearchHits } from './bar-search.core';

const PLACE = {
  id: 'places/1',
  displayName: { text: 'Le Zinc' },
  formattedAddress: '3 rue de Paris, 75011 Paris, France',
  nationalPhoneNumber: '01 02 03 04 05',
  addressComponents: [
    { longText: 'Paris', types: ['locality', 'political'] },
    { longText: 'France', types: ['country'] },
  ],
};

describe('mapPlacesToBarSearchHits', () => {
  it('reads the fields a bar record needs out of a place', () => {
    expect(mapPlacesToBarSearchHits({ places: [PLACE] })).toEqual([
      {
        placeId: 'places/1',
        name: 'Le Zinc',
        address: '3 rue de Paris, 75011 Paris, France',
        city: 'Paris',
        phone: '01 02 03 04 05',
      },
    ]);
  });

  it('falls back to the postal town where there is no locality', () => {
    const hits = mapPlacesToBarSearchHits({
      places: [
        {
          ...PLACE,
          addressComponents: [{ longText: 'Reading', types: ['postal_town'] }],
        },
      ],
    });
    expect(hits[0]?.city).toBe('Reading');
  });

  it('has no city when the place carries no components at all', () => {
    const hits = mapPlacesToBarSearchHits({
      places: [{ id: 'places/2', displayName: { text: 'X' } }],
    });
    expect(hits[0]).toEqual({
      placeId: 'places/2',
      name: 'X',
      address: null,
      city: null,
      phone: null,
    });
  });

  it('has no city when no component names one', () => {
    const hits = mapPlacesToBarSearchHits({
      places: [{ ...PLACE, addressComponents: [{ longText: 'France', types: ['country'] }] }],
    });
    expect(hits[0]?.city).toBeNull();
  });

  it('drops a place with no name rather than offering a blank row', () => {
    expect(mapPlacesToBarSearchHits({ places: [{ id: 'places/3' }] })).toEqual([]);
  });

  it('answers an empty list for an empty or unexpected body', () => {
    expect(mapPlacesToBarSearchHits({})).toEqual([]);
    expect(mapPlacesToBarSearchHits({ places: 'nope' })).toEqual([]);
    expect(mapPlacesToBarSearchHits(null)).toEqual([]);
  });
});
