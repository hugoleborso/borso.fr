import { describe, expect, it } from 'vitest';
import { classifySchemaBoundary, readErrorCode } from './schema-boundary.core';

describe('classifySchemaBoundary', () => {
  it('reads a successful read of production as an open boundary', () => {
    expect(classifySchemaBoundary(null)).toBe('open');
  });

  it('reads a permission refusal as an enforced boundary', () => {
    expect(classifySchemaBoundary('42501')).toBe('enforced');
  });

  it('reads a missing production table or schema as nothing to read', () => {
    expect(classifySchemaBoundary('42P01')).toBe('nothing-to-read');
    expect(classifySchemaBoundary('3F000')).toBe('nothing-to-read');
  });

  it('reads any other failure as inconclusive', () => {
    expect(classifySchemaBoundary('08006')).toBe('inconclusive');
    expect(classifySchemaBoundary('')).toBe('inconclusive');
  });
});

describe('readErrorCode', () => {
  it('reads the Postgres error code, and nothing from anything else', () => {
    expect(readErrorCode({ code: '42501' })).toBe('42501');
    expect(readErrorCode({ code: 42_501 })).toBe('');
    expect(readErrorCode(new Error('no code'))).toBe('');
    expect(readErrorCode(null)).toBe('');
    expect(readErrorCode('42501')).toBe('');
  });
});
