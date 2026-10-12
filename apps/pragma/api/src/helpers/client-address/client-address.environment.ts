import type { Context } from 'hono';
import {
  ORIGIN_VERIFY_HEADER,
  resolveClientAddress,
  VIEWER_ADDRESS_HEADER,
} from './client-address.core';

const ORIGIN_VERIFY_ENVIRONMENT_VARIABLE = 'ORIGIN_VERIFY_SECRET';

// @FollowsBlueprint environment-reader
export function readClientAddress(context: Context): string {
  return resolveClientAddress({
    viewerAddressHeader: context.req.header(VIEWER_ADDRESS_HEADER),
    originVerifyHeader: context.req.header(ORIGIN_VERIFY_HEADER),
    expectedOriginVerify: process.env[ORIGIN_VERIFY_ENVIRONMENT_VARIABLE],
    lambdaEnvironment: context.env,
  });
}
