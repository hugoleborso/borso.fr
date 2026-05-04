/**
 * Re-exports the CloudFront Function (viewer-request) source code that
 * rewrites directory-style URIs to `/<dir>/index.html` for the per-app
 * `StaticSite` distribution.
 *
 * The actual JS lives in the sibling `cf-static-site-index-rewrite.code.js`
 * so it can be syntax-highlighted, lint-checked, and unit-tested as real
 * JS instead of an unparsed template literal.
 *
 * @beta
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export const STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE = readFileSync(
  join(HERE, 'cf-static-site-index-rewrite.code.js'),
  'utf8',
);
