import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// @FollowsBlueprint cloudfront-function-source
export const API_VIEWER_ADDRESS_FUNCTION_CODE = readFileSync(
  join(HERE, 'cf-api-viewer-address.code.js'),
  'utf8',
);
