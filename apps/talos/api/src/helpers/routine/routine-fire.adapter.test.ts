/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { type SecretName, useSecretReader } from '../secrets/secrets.setup';
import { fireRoutine } from './routine-fire.adapter';

function readsSecrets(secrets: Partial<Record<SecretName, string>>) {
  return async (name: SecretName) => await Promise.resolve(secrets[name]);
}

const CONFIGURED = readsSecrets({
  'fire-url': 'https://api.anthropic.com/v1/routines/r1/fire',
  'fire-token': 'jeton',
  'secret-phrase': 'phrase',
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// @FollowsBlueprint test-node-adapter
describe('fireRoutine', () => {
  it('skips the call when no fire url is configured', async () => {
    const fetcher = vi.fn();
    expect(
      await fireRoutine('message', 'boite/messages/a.md', {
        fetcher,
        readSecret: readsSecrets({}),
      }),
    ).toEqual({ kind: 'skipped' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('posts the file to the routine with the contract headers', async () => {
    const fetcher = vi.fn(async () => await Promise.resolve(new Response('{}', { status: 200 })));
    expect(
      await fireRoutine('proposition', 'etat/propositions/p.md', {
        fetcher,
        readSecret: CONFIGURED,
      }),
    ).toEqual({ kind: 'fired' });
    expect(fetcher).toHaveBeenCalledWith('https://api.anthropic.com/v1/routines/r1/fire', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer jeton',
        'anthropic-beta': 'experimental-cc-routine-2026-04-01',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'phrase\nproposition: etat/propositions/p.md' }),
    });
  });

  it('reports a refused call', async () => {
    const fetcher = vi.fn(async () => await Promise.resolve(new Response('{}', { status: 401 })));
    expect(await fireRoutine('message', 'm.md', { fetcher, readSecret: CONFIGURED })).toEqual({
      kind: 'failed',
      status: 401,
    });
  });

  it('reports a network failure without throwing, since the file is already committed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetcher = vi.fn(async () => await Promise.reject(new Error('réseau coupé')));
    expect(await fireRoutine('message', 'm.md', { fetcher, readSecret: CONFIGURED })).toEqual({
      kind: 'failed',
      status: 0,
    });
    expect(warn).toHaveBeenCalledWith(
      'the routine could not be fired, the next scheduled run will pick it up',
      expect.any(Error),
    );
  });

  it('uses the global fetch by default', async () => {
    const fetcher = vi.fn(async () => await Promise.resolve(new Response('{}', { status: 200 })));
    vi.stubGlobal('fetch', fetcher);
    expect(await fireRoutine('message', 'm.md', { readSecret: CONFIGURED })).toEqual({
      kind: 'fired',
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe('fireRoutine without an injected secret reader', () => {
  it('reads the fire url through the installed secret reader', async () => {
    useSecretReader(readsSecrets({}));
    const fetcher = vi.fn();
    expect(await fireRoutine('message', 'm.md', { fetcher })).toEqual({ kind: 'skipped' });
  });
});
