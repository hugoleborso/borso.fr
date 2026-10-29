import type { AppRouter } from '@api/app';
import { hc } from 'hono/client';
import { isEndedSessionBody, canAnswerEndedSession } from './session-end.core';

const RAW_API_BASE: unknown = import.meta.env.VITE_API_BASE;
export const API_BASE: string =
  typeof RAW_API_BASE === 'string' && RAW_API_BASE.length > 0
    ? RAW_API_BASE.replace(/\/$/, '')
    : '';

export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type SessionEndListener = () => void;

const sessionEndListeners = new Set<SessionEndListener>();

export function onSessionEnded(listener: SessionEndListener): () => void {
  sessionEndListeners.add(listener);
  return () => sessionEndListeners.delete(listener);
}

async function readJsonOrNull(response: { json: () => Promise<unknown> }): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);
  return body;
}

export async function readErrorBody(response: { json: () => Promise<unknown> }): Promise<unknown> {
  return await readJsonOrNull(response);
}

export async function fetchWatchingSessionEnd(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  if (!canAnswerEndedSession(response.status)) return response;
  if (!isEndedSessionBody(await readJsonOrNull(response.clone()))) return response;
  sessionEndListeners.forEach((listener) => listener());
  return response;
}

/**
 * @Blueprint typed-api-client
 * @BlueprintName Typed API Client
 * @BlueprintUsage Use for every call a front end makes to its own API. One client per application, built from the router type.
 * @BlueprintDescription Builds the client as `hc<AppRouter>`, so route paths, parameters, request bodies and JSON responses are all read off the back end's router type and a renamed field becomes a compile error in the component that reads it. The base URL is resolved once from the build environment rather than written as a relative `/api` string, because the front end and the API sit on different origins in preview, and `credentials: 'include'` is set here so no caller has to remember the session cookie. Every answer also passes `fetchWatchingSessionEnd`, so a 401 that says the session is gone ends it once for the whole application rather than in each of the eighty places that read a response.
 */
export const api = hc<AppRouter>(API_BASE === '' ? '/' : API_BASE, {
  init: { credentials: 'include' },
  fetch: fetchWatchingSessionEnd,
});

export function isResponseSuccessful<TResponse extends { readonly ok: boolean }>(
  response: TResponse,
): response is Extract<TResponse, { readonly ok: true }> {
  return response.ok;
}
