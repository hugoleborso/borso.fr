/**
 * The error every failed API call throws. It lives apart from `api.ts` so a
 * pure decision function can import it without pulling in the Hono client,
 * which builds itself at module load time.
 */

export class ApiError extends Error {
  override readonly name = 'ApiError';
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API ${status}`);
  }
}
