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

  it('always answers an object schema', () => {
    expect(compactInputSchema({})).toEqual({ type: 'object' });
  });
});
