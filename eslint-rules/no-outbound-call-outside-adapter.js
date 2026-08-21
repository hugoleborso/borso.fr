import { toPosixPath } from './site-paths.js';

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
