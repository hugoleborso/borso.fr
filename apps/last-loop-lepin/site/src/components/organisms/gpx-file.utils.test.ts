import { describe, expect, it } from 'vitest';
import { selectOptionalGpxResult, selectRequiredGpxResult } from './gpx-file.utils';

// @FollowsBlueprint test-pure-unit
describe('selectRequiredGpxResult', () => {
  it('asks for a file when none was picked', () => {
    expect(selectRequiredGpxResult(false, null)).toEqual({
      xml: null,
      errorKey: 'admin.setup.gpx-missing',
    });
  });

  it('reports a file that could not be read', () => {
    expect(selectRequiredGpxResult(true, null)).toEqual({
      xml: null,
      errorKey: 'admin.setup.gpx-unreadable',
    });
  });

  it('reports an empty file', () => {
    expect(selectRequiredGpxResult(true, '')).toEqual({
      xml: null,
      errorKey: 'admin.setup.gpx-empty',
    });
  });

  it('carries the track when the read succeeded', () => {
    expect(selectRequiredGpxResult(true, '<gpx/>')).toEqual({ xml: '<gpx/>', errorKey: null });
  });
});

describe('selectOptionalGpxResult', () => {
  it('accepts no file, which keeps the persisted track', () => {
    expect(selectOptionalGpxResult(false, null)).toEqual({ xml: null, errorKey: null });
  });

  it('reports a picked file that could not be read', () => {
    expect(selectOptionalGpxResult(true, null).errorKey).toBe('admin.setup.gpx-unreadable');
  });

  it('reports a picked file that is empty', () => {
    expect(selectOptionalGpxResult(true, '').errorKey).toBe('admin.setup.gpx-empty');
  });

  it('carries the replacement track', () => {
    expect(selectOptionalGpxResult(true, '<gpx/>')).toEqual({ xml: '<gpx/>', errorKey: null });
  });
});
