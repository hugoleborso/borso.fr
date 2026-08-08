import { describe, expect, it } from 'vitest';
import { selectOpeningsLoad } from './openingsLoad.utils';
import type { Opening } from './types';

const OPENINGS: Opening[] = [{ id: 'italian', name: 'Italian Game', ecoCodes: [], variations: [] }];

describe('selectOpeningsLoad', () => {
  it('reports a successful load with its openings', () => {
    expect(selectOpeningsLoad({ ok: true, openings: OPENINGS })).toEqual({
      status: 'loaded',
      openings: OPENINGS,
    });
  });

  it('reports a failed load with no openings', () => {
    expect(selectOpeningsLoad({ ok: false, error: new Error('offline') })).toEqual({
      status: 'failed',
      openings: [],
    });
  });
});
