/**
 * @DependsOnExternal aws-apigateway-management
 */

import { z } from 'zod';

export const GONE_STATUS_CODE = 410;

export interface DeliveryOutcome {
  readonly isGone: boolean;
}

export interface ConnectionPoster {
  postToConnection(input: { ConnectionId: string; Data: string }): Promise<unknown>;
}

const statusCarrierSchema = z.object({
  $metadata: z.object({ httpStatusCode: z.number() }),
});

function readStatusCode(failure: unknown): number | undefined {
  const carrier = statusCarrierSchema.safeParse(failure);
  return carrier.success ? carrier.data.$metadata.httpStatusCode : undefined;
}

// @FollowsBlueprint adapter-outcome-instead-of-a-throw
export async function postToConnection(
  poster: ConnectionPoster,
  connectionId: string,
  payload: unknown,
): Promise<DeliveryOutcome> {
  try {
    await poster.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(payload),
    });
    return { isGone: false };
  } catch (error) {
    if (readStatusCode(error) === GONE_STATUS_CODE) return { isGone: true };
    throw error;
  }
}
