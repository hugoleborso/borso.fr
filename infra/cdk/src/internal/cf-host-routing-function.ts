import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// @FollowsBlueprint cloudfront-function-source
export const HOST_ROUTING_FUNCTION_CODE = readFileSync(
  join(HERE, 'cf-host-routing-function.code.js'),
  'utf8',
);
