import { onEveryModuleSource } from './module-source.js';
import { isSiteFile, toPosixPath } from './site-paths.js';

const MESSAGE =
  'Only `observability/` may import `{{vendor}}`. Call the adapter there instead, so the ' +
  'category, level and event names are chosen once rather than at each call site. ' +
  'See docs/standards/06-data-fetching.md.';

const VENDOR_PATTERNS = [/^@sentry\//, /^posthog-js/, /^@datadog\//];

const ADAPTER_DIRECTORY_PATTERN = /(^|\/)observability(\/|$)/;

const TEST_FILE_PATTERN = /\.test\.[jt]sx?$/;

function readVendor(source) {
  return VENDOR_PATTERNS.some((pattern) => pattern.test(source)) ? source : null;
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Keep a reporting SDK inside its adapter module.' },
    schema: [],
    messages: { vendorSdkOutsideAdapter: MESSAGE },
  },
  create(context) {
    const filename = toPosixPath(context.filename);
    if (
      !isSiteFile(filename) ||
      ADAPTER_DIRECTORY_PATTERN.test(filename) ||
      TEST_FILE_PATTERN.test(filename)
    ) {
      return {};
    }
    return onEveryModuleSource((source, node) => {
      const vendor = readVendor(source);
      if (vendor !== null) {
        context.report({
          node: node.source,
          messageId: 'vendorSdkOutsideAdapter',
          data: { vendor },
        });
      }
    });
  },
};
