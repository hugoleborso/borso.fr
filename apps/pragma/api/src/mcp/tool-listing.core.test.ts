import { describe, expect, it } from 'vitest';
import { compactInputSchema } from './tool-listing.core';

// @FollowsBlueprint test-pure-unit
describe('compactInputSchema', () => {
  it('drops the dialect and the closed-object marks at any depth, keeping everything else', () => {
    expect(
      compactInputSchema({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        additionalProperties: false,
        properties: {
          song: { type: 'string', minLength: 1, default: null, uniqueItems: false },
          lineup: {
            type: 'object',
            additionalProperties: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          },
          links: {
            type: 'array',
            items: { type: 'object', additionalProperties: false, properties: {} },
          },
        },
        required: ['song'],
      }),
    ).toEqual({
      type: 'object',
      properties: {
        song: { type: 'string', minLength: 1, default: null, uniqueItems: false },
        lineup: {
          type: 'object',
          additionalProperties: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
        links: { type: 'array', items: { type: 'object', properties: {} } },
      },
      required: ['song'],
    });
  });

  it('drops a pattern that restates its format, and integer bounds that only restate the safe range', () => {
    expect(
      compactInputSchema({
        properties: {
          id: { type: 'string', format: 'uuid', pattern: '^[0-9a-f-]{36}$' },
          code: { type: 'string', pattern: '^[A-G]$' },
          count: {
            type: 'integer',
            minimum: Number.MIN_SAFE_INTEGER,
            maximum: Number.MAX_SAFE_INTEGER,
          },
          energy: { type: 'integer', minimum: 1, maximum: 5 },
        },
      }),
    ).toEqual({
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        code: { type: 'string', pattern: '^[A-G]$' },
        count: { type: 'integer' },
        energy: { type: 'integer', minimum: 1, maximum: 5 },
      },
    });
  });

  it('keeps a field named pattern beside a field named format', () => {
    const properties = { format: { type: 'string' }, pattern: { type: 'string' } };
    expect(compactInputSchema({ properties })).toEqual({ type: 'object', properties });
  });

  it('always answers an object schema', () => {
    expect(compactInputSchema({})).toEqual({ type: 'object' });
  });
});
