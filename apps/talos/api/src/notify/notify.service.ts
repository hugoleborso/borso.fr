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
  if (expected === undefined) throw new TalosError('not-configured');
  const provided = readBearerToken(authorizationHeader ?? '');
  if (provided === null || !areSecretsEqual(provided, expected)) {
    throw new TalosError('invalid-bearer-token');
  }
}

export async function notifyOwner(push: PushMessage): Promise<DeliveryReport & { ok: true }> {
  return { ok: true, ...(await pushToEverySubscription(push)) };
}
