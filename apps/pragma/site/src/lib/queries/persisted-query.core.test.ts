import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { isQueryKeyPersisted, isQueryPersisted } from './persisted-query.core';
import { songKeys } from './songs.queries';

// @FollowsBlueprint test-pure-unit
describe('isQueryKeyPersisted', () => {
  it('keeps a song preview address off the phone, since it expires', () => {
    expect(isQueryKeyPersisted(songKeys.preview('song-1'))).toBe(false);
  });

  it('keeps every other song read', () => {
    expect(isQueryKeyPersisted(songKeys.byId('song-1'))).toBe(true);
    expect(isQueryKeyPersisted(songKeys.list())).toBe(true);
    expect(isQueryKeyPersisted(['setlists', 'preview', 'x'])).toBe(true);
  });
});

describe('isQueryPersisted', () => {
  it('saves a successful read and never a preview or an unfinished one', () => {
    const client = new QueryClient();
    client.setQueryData(songKeys.list(), { songs: [] });
    client.setQueryData(songKeys.preview('song-1'), { previewUrl: null });
    const cache = client.getQueryCache();
    const pending = cache.build(client, { queryKey: songKeys.byId('song-2') });
    expect(isQueryPersisted(cache.build(client, { queryKey: songKeys.list() }))).toBe(true);
    expect(isQueryPersisted(cache.build(client, { queryKey: songKeys.preview('song-1') }))).toBe(
      false,
    );
    expect(isQueryPersisted(pending)).toBe(false);
  });
});
