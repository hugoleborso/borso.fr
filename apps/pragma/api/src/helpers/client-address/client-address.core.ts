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

/**
 * @Blueprint client-address-resolution
 * @BlueprintName Client Address From A Source The Client Cannot Forge
 * @BlueprintUsage Use for every value an API keys a per-client limit on, such as a sign-in or a public write rate limit.
 * @BlueprintDescription Never reads `X-Forwarded-For`, whose first entry is whatever the client typed. A request that carries the origin-verify secret came through the CloudFront distribution, whose viewer-request function overwrote the viewer address header with the address it accepted the connection from, so that header is trusted; any other request is keyed on the TCP peer API Gateway saw, which a client cannot choose either. Calling the API directly therefore buys a caller nothing: they are keyed on their own address. The secret comparison runs over digests so it takes the same time whatever the input, and the Lambda event is parsed rather than cast, so a test or a local server without one lands on a single `unknown` bucket rather than throwing.
 */
export function resolveClientAddress(sources: ClientAddressSources): string {
  return (
    readViewerAddress(sources) ?? readSourceIp(sources.lambdaEnvironment) ?? UNKNOWN_CLIENT_ADDRESS
  );
}
