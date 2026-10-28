import { describe, expect, it } from 'vitest';
import { buildSetlistViewParams, selectSetlistView } from './setlist-view.core';

describe('selectSetlistView', () => {
  it('opens on Songs when the address names nothing', () => {
    expect(
      selectSetlistView({ requestedView: null, requestedMemberId: null, signedInMemberId: 'me' }),
    ).toEqual({ view: 'songs', memberId: null });
  });

  it('opens on My part for the member a link names', () => {
    expect(
      selectSetlistView({ requestedView: null, requestedMemberId: 'tom', signedInMemberId: 'me' }),
    ).toEqual({ view: 'my-part', memberId: 'tom' });
  });

  it('falls back to the signed-in member on My part', () => {
    expect(
      selectSetlistView({
        requestedView: 'my-part',
        requestedMemberId: null,
        signedInMemberId: 'me',
      }),
    ).toEqual({ view: 'my-part', memberId: 'me' });
  });

  it('opens the Lineup view and drops the member', () => {
    expect(
      selectSetlistView({
        requestedView: 'lineup',
        requestedMemberId: 'tom',
        signedInMemberId: 'me',
      }),
    ).toEqual({ view: 'lineup', memberId: null });
  });

  it('ignores a view it does not know', () => {
    expect(
      selectSetlistView({
        requestedView: 'energy',
        requestedMemberId: null,
        signedInMemberId: null,
      }),
    ).toEqual({ view: 'songs', memberId: null });
  });
});

describe('buildSetlistViewParams', () => {
  it('writes nothing for Songs', () => {
    expect(buildSetlistViewParams('songs', 'tom')).toEqual({});
  });

  it('writes the view alone for Lineup', () => {
    expect(buildSetlistViewParams('lineup', 'tom')).toEqual({ view: 'lineup' });
  });

  it('writes the view and the member for My part', () => {
    expect(buildSetlistViewParams('my-part', 'tom')).toEqual({ view: 'my-part', member: 'tom' });
  });

  it('writes the view alone for My part with no member yet', () => {
    expect(buildSetlistViewParams('my-part', null)).toEqual({ view: 'my-part' });
  });
});
