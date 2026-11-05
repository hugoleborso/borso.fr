import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { answerInvalidInput } from './invalid-input.middleware';

const app = new Hono().post(
  '/',
  zValidator('json', z.object({ name: z.string() }), answerInvalidInput),
  (context) => context.json(context.req.valid('json')),
);

async function post(body: unknown): Promise<Response> {
  return await app.request('/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('answerInvalidInput', () => {
  it('answers a refused body with its issues listed, field by field', async () => {
    const response = await post({});
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: {
        issues: [
          expect.objectContaining({
            path: ['name'],
            message: 'Invalid input: expected string, received undefined',
          }),
        ],
      },
    });
  });

  it('lets a valid body through to the route', async () => {
    const response = await post({ name: 'Lepin' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: 'Lepin' });
  });
});
