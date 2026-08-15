/**
 * Request helpers for the back-e2e suites. The application has no session, so
 * a request carries nothing but its body; what these add is the absolute URL
 * `app.request` wants and a Zod parse of the response, since the repository
 * bans the type assertion the alternative would need.
 */

import type { Hono } from 'hono';
import type { z } from 'zod';

export const TEST_HOST = 'http://localhost';

export interface JsonRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly body?: unknown;
}

export async function jsonRequest(
  app: Hono,
  path: string,
  options: JsonRequestOptions = {},
): Promise<Response> {
  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers: { 'content-type': 'application/json' },
  };
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }
  return app.request(`${TEST_HOST}${path}`, init);
}

export async function readJson<Output>(
  response: Response,
  schema: z.ZodType<Output>,
): Promise<Output> {
  return schema.parse(await response.json());
}
