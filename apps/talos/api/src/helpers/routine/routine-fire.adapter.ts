/**
 * @DependsOnExternal claude-routine
 */

import { readTalosSecret, type SecretReader } from '../secrets/secrets.setup';
import {
  buildFireBody,
  buildFireHeaders,
  type FireOutcome,
  readFireOutcome,
  type RoutineTrigger,
} from './routine-fire.core';

export type ExternalFetcher = (url: string, init: RequestInit) => Promise<Response>;

export interface FireRoutineOptions {
  readonly fetcher?: ExternalFetcher;
  readonly readSecret?: SecretReader;
}

const NETWORK_FAILURE_STATUS = 0;

// @FollowsBlueprint adapter-outcome-instead-of-a-throw
export async function fireRoutine(
  trigger: RoutineTrigger,
  path: string,
  options: FireRoutineOptions = {},
): Promise<FireOutcome> {
  const readSecret = options.readSecret ?? readTalosSecret;
  const fetcher = options.fetcher ?? fetch;
  const fireUrl = await readSecret('fire-url');
  if (fireUrl === undefined) return { kind: 'skipped' };
  const [token, secretPhrase] = await Promise.all([
    readSecret('fire-token'),
    readSecret('secret-phrase'),
  ]);
  try {
    const response = await fetcher(fireUrl, {
      method: 'POST',
      headers: buildFireHeaders(token),
      body: buildFireBody(secretPhrase, trigger, path),
    });
    return readFireOutcome(response.status);
  } catch (error) {
    console.warn('the routine could not be fired, the next scheduled run will pick it up', error);
    return { kind: 'failed', status: NETWORK_FAILURE_STATUS };
  }
}
