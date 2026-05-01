/**
 * Re-exports the CloudFront Function (viewer-request) source code as a
 * string for `cloudfront.Function`'s `code: FunctionCode.fromInline(...)`.
 *
 * The actual JS lives in the sibling `cf-host-routing-function.js` so it
 * can be syntax-highlighted, lint-checked, and unit-tested as real JS
 * instead of an unparsed template literal.
 *
 * @beta
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export const HOST_ROUTING_FUNCTION_CODE = readFileSync(
  join(HERE, 'cf-host-routing-function.code.js'),
  'utf8',
);
