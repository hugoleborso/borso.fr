import { authorizeAgent } from '../agent/agent.service';
import { areSecretsEqual } from '../helpers/crypto/secret-comparison.utils';
import { TalosError } from '../helpers/errors/talos-error.types';
import { readBearerToken } from '../helpers/http/bearer-token.core';
import { readTalosSecret } from '../helpers/secrets/secrets.setup';
import {
  type DeliveryReport,
  type PushMessage,
  pushToEverySubscription,
} from '../push/push.service';

// @FollowsBlueprint service-orchestration
export async function authorizeNotifier(authorizationHeader: string | undefined): Promise<void> {
  const expected = await readTalosSecret('notify-secret');
  const provided = readBearerToken(authorizationHeader ?? '');
  if (provided !== null && expected !== undefined && areSecretsEqual(provided, expected)) return;
  if (await isAgentToken(authorizationHeader)) return;
  throw new TalosError(expected === undefined ? 'not-configured' : 'invalid-bearer-token');
}

async function isAgentToken(authorizationHeader: string | undefined): Promise<boolean> {
  try {
    await authorizeAgent(authorizationHeader);
    return true;
  } catch {
    return false;
  }
}

export async function notifyOwner(push: PushMessage): Promise<DeliveryReport & { ok: true }> {
  return { ok: true, ...(await pushToEverySubscription(push)) };
}
