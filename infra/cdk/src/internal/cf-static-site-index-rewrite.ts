import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * @Blueprint cloudfront-function-source
 * @BlueprintName CloudFront Function Source
 * @BlueprintUsage Use for any code that runs on the CloudFront edge runtime rather than in Node.
 * @BlueprintDescription Keeps the edge code in a sibling `.code.js` file and reads it into a string here with `readFileSync`, because `FunctionCode.fromInline` wants a string and the edge runtime has no module system, so the file can carry neither an import nor an export. Reading a real file instead of holding the code in a template literal is what lets the linter, the editor and a test see it as JavaScript, and the path is resolved from `import.meta.url` so it works both from `src/` under the test run and from `dist/` once the package is built and the file is copied across.
 */
export const STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE = readFileSync(
  join(HERE, 'cf-static-site-index-rewrite.code.js'),
  'utf8',
);
