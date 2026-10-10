import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const VIEWER_ADDRESS_HEADER = 'x-borso-viewer-address';
export const ORIGIN_VERIFY_HEADER = 'x-borso-origin-verify';
export const UNKNOWN_CLIENT_ADDRESS = 'unknown';

const lambdaEnvironmentSchema = z.object({
  event: z.object({
    requestContext: z.object({ http: z.object({ sourceIp: z.string().min(1) }) }),
  }),
});

export interface ClientAddressSources {
  readonly viewerAddressHeader: string | undefined;
  readonly originVerifyHeader: string | undefined;
  readonly expectedOriginVerify: string | undefined;
  readonly lambdaEnvironment: unknown;
}

export function readSourceIp(lambdaEnvironment: unknown): string | undefined {
  const lambdaEvent = lambdaEnvironmentSchema.safeParse(lambdaEnvironment);
  return lambdaEvent.success ? lambdaEvent.data.event.requestContext.http.sourceIp : undefined;
}

function digestOf(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function isOriginVerified(
  received: string | undefined,
  expected: string | undefined,
): boolean {
  if (received === undefined || expected === undefined || expected.length === 0) return false;
  return timingSafeEqual(digestOf(received), digestOf(expected));
}

function readViewerAddress(sources: ClientAddressSources): string | undefined {
  if (!isOriginVerified(sources.originVerifyHeader, sources.expectedOriginVerify)) return undefined;
  const trimmed = sources.viewerAddressHeader?.trim() ?? '';
  return trimmed.length === 0 ? undefined : trimmed;
}

// @FollowsBlueprint client-address-resolution
export function resolveClientAddress(sources: ClientAddressSources): string {
  return (
    readViewerAddress(sources) ?? readSourceIp(sources.lambdaEnvironment) ?? UNKNOWN_CLIENT_ADDRESS
  );
}
