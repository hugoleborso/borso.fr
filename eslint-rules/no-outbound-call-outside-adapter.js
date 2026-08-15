import { toPosixPath } from './site-paths.js';

/**
 * An outbound call is the one thing on the architecture map that no path could
 * tell you about. Level 1's edges came from a `@DependsOnExternal` tag somebody
 * remembered to write, so a `fetch` added without one made the context diagram
 * quietly wrong, and the diagram had no way to notice.
 *
 * ADR-0012 gives outbound calls a home: `<domain>.adapter.ts`, beside the
 * bounded context that owns it. The suffix already means this on the front end,
 * and the layer table already knows it, so the edge falls out of the tree.
 *
 * This rule reports `fetch(...)` and the construction of an AWS SDK client
 * anywhere else.
 *
 * What it deliberately allows:
 *
 * - `*.adapter.ts`, which is the point.
 * - `database/client.ts`, because the DSQL signer plus a Postgres driver is the
 *   database connection rather than an integration, and the database is drawn
 *   as a container of its own rather than as an external.
 * - A test, which may stub a client to assert what the adapter sends.
 * - `scripts/` and `infra/`, which are build-time tools rather than the
 *   application the map draws.
 *
 * What it cannot see: a library that opens a socket some other way. The gate is
 * a floor, not a proof — ADR-0012 says so in its consequences.
 *
 * See docs/adr/0012-outbound-calls-live-in-adapter-files.md.
 */
const MESSAGE =
  'An outbound call belongs in a `<domain>.adapter.ts` file. Move {{what}} there and call ' +
  'the adapter from here, so the architecture map can read the dependency off the tree ' +
  'rather than off a tag. See docs/adr/0012-outbound-calls-live-in-adapter-files.md.';

const ADAPTER_FILE_PATTERN = /\.adapter\.tsx?$/;
const TEST_FILE_PATTERN = /\.test\.[jt]sx?$/;
const DATABASE_CLIENT_PATTERN = /(^|\/)database\/client\.ts$/;
const APPLICATION_FILE_PATTERN = /(^|\/)apps\/[^/]+\//;
const AWS_CLIENT_PATTERN = /^(S3|SQS|SNS|DynamoDB|Lambda|EventBridge|SES|SecretsManager)\w*Client$/;

function isExempt(filename) {
  return (
    !APPLICATION_FILE_PATTERN.test(filename) ||
    ADAPTER_FILE_PATTERN.test(filename) ||
    TEST_FILE_PATTERN.test(filename) ||
    DATABASE_CLIENT_PATTERN.test(filename)
  );
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Keep every outbound network call inside an adapter module.' },
    schema: [],
    messages: { outboundCallOutsideAdapter: MESSAGE },
  },
  create(context) {
    if (isExempt(toPosixPath(context.filename))) return {};
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'fetch') return;
        context.report({
          node,
          messageId: 'outboundCallOutsideAdapter',
          data: { what: 'the fetch' },
        });
      },
      NewExpression(node) {
        if (node.callee.type !== 'Identifier' || !AWS_CLIENT_PATTERN.test(node.callee.name)) return;
        context.report({
          node,
          messageId: 'outboundCallOutsideAdapter',
          data: { what: `the ${node.callee.name}` },
        });
      },
    };
  },
};
