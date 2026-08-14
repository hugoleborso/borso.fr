import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { selectMissingRecordReason } from './missing-record.utils';

describe('selectMissingRecordReason', () => {
  it('reads a 404 as a record that is gone', () => {
    expect(selectMissingRecordReason(new ApiError(404, 'song 404', null))).toBe('not-found');
  });

  it('reads any other API status as a failed read', () => {
    expect(selectMissingRecordReason(new ApiError(500, 'song 500', null))).toBe('load-failed');
  });

  it('reads a non-API failure as a failed read', () => {
    expect(selectMissingRecordReason(new TypeError('offline'))).toBe('load-failed');
  });

  it('reads the absence of an error as a failed read', () => {
    expect(selectMissingRecordReason(null)).toBe('load-failed');
  });
});
