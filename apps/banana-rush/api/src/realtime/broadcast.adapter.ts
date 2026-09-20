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

/**
 * @Blueprint adapter-outcome-instead-of-a-throw
 * @BlueprintName Adapter Returning An Outcome Instead Of Throwing
 * @BlueprintUsage Use for an outbound call whose most common failure is expected and means something the caller should act on rather than report.
 * @BlueprintDescription Turns the vendor's error into a named outcome, because a phone that closed its socket is the normal end of a connection and not an incident. The client arrives as an argument typed by the one method this file calls, so a test passes an object literal and never mocks a module. The status code is read through a narrowing helper rather than a type assertion, so a failure shaped like anything else still reaches the caller as a throw, which is what an unexpected failure should do.
 */
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
