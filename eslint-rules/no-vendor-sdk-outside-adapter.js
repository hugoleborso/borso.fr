import { isSiteFile, toPosixPath } from './site-paths.js';

/**
 * A reporting client is a vendor's, and the names it wants — a category, a
 * level, a breadcrumb type — are the vendor's too. When components call it
 * directly, those names are chosen once per call site, so two screens report
 * the same thing under two spellings and the dashboard cannot group them.
 *
 * One adapter under `observability/` fixes the vocabulary in one place and
 * exposes closed unions, so a name that does not exist is a type error rather
 * than an event nobody ever finds. Swapping the vendor is then one file rather
 * than a search across the site.
 *
 * What this deliberately allows:
 *
 * - `observability/**`, which is the adapter and the only place the SDK is
 *   meant to appear.
 * - Everything outside `apps/<app>/site/`, because a Lambda reporting to a
 *   vendor is a different question with a different answer.
 * - A test, which may stub the SDK to assert what the adapter sends.
 *
 * See docs/standards/06-data-fetching.md.
 */
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
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') {
          return;
        }
        const vendor = readVendor(source);
        if (vendor !== null) {
          context.report({
            node: node.source,
            messageId: 'vendorSdkOutsideAdapter',
            data: { vendor },
          });
        }
      },
    };
  },
};
