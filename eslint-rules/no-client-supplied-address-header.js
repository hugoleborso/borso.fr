import { isTestPath } from './impurity.js';
import { toPosixPath } from './site-paths.js';

const FORGEABLE_MESSAGE =
  'This header carries whatever the client typed: `X-Forwarded-For` starts with the ' +
  "client's own value and CloudFront only appends after it, so a limit keyed on it resets " +
  'with every request. Key a per-client limit on `readClientAddress(context)` from ' +
  '`helpers/client-address/`. See docs/dantotsus/rate-limits-keyed-on-a-header-the-client-writes.md.';

const TRUSTED_HEADER_MESSAGE =
  'The viewer address and origin-verify headers are only trustworthy together, and only ' +
  '`helpers/client-address/client-address.core.ts` checks both. Call `readClientAddress(context)`.';

const FORGEABLE_HEADER_NAMES = new Set([
  'x-forwarded-for',
  'x-real-ip',
  'x-client-ip',
  'true-client-ip',
  'forwarded',
  'cloudfront-viewer-address',
]);

const TRUSTED_HEADER_NAMES = new Set(['x-borso-viewer-address', 'x-borso-origin-verify']);

const CLIENT_ADDRESS_CORE_PATTERN = /\/helpers\/client-address\/client-address\.core\.ts$/;

function readStaticString(node) {
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  return null;
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Key per-client limits on an address the client cannot forge.' },
    schema: [],
    messages: { forgeableHeader: FORGEABLE_MESSAGE, trustedHeader: TRUSTED_HEADER_MESSAGE },
  },
  create(context) {
    const filename = toPosixPath(context.filename);
    if (isTestPath(filename)) return {};
    const isClientAddressCore = CLIENT_ADDRESS_CORE_PATTERN.test(filename);
    function inspect(node) {
      const value = readStaticString(node);
      if (value === null) return;
      const headerName = value.toLowerCase();
      if (FORGEABLE_HEADER_NAMES.has(headerName)) {
        context.report({ node, messageId: 'forgeableHeader' });
      } else if (TRUSTED_HEADER_NAMES.has(headerName) && !isClientAddressCore) {
        context.report({ node, messageId: 'trustedHeader' });
      }
    }
    return { Literal: inspect, TemplateLiteral: inspect };
  },
};
