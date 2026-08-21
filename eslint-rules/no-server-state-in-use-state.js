import { forEachDescendant } from './ast-walk.js';
import { isSiteFile } from './site-paths.js';
import { isUseEffectCallee } from './no-use-effect.js';

const MESSAGE =
  'This effect reads the server and writes the result into React state. Server state lives in ' +
  'TanStack Query, so the read is a `useQuery` in `lib/queries/<domain>.ts` and the write is a ' +
  '`useMutation`, both typed by the Hono client. See docs/standards/06-data-fetching.md.';

const STATE_SETTER_PATTERN = /^set[A-Z]/;

const TIMER_FUNCTIONS = new Set(['setTimeout', 'setInterval', 'setImmediate']);

const HONO_REQUEST_METHODS = new Set(['$get', '$post', '$put', '$patch', '$delete']);

const API_CLIENT_NAMES = new Set(['api', 'apiClient']);

function readRootObjectName(node) {
  let current = node;
  while (current.type === 'MemberExpression') {
    current = current.object;
  }
  return current.type === 'Identifier' ? current.name : null;
}

function isServerReadCall(node) {
  if (node.type !== 'CallExpression') {
    return false;
  }
  if (node.callee.type === 'Identifier') {
    return node.callee.name === 'fetch';
  }
  if (node.callee.type !== 'MemberExpression' || node.callee.computed) {
    return false;
  }
  if (
    node.callee.property.type === 'Identifier' &&
    HONO_REQUEST_METHODS.has(node.callee.property.name)
  ) {
    return true;
  }
  const rootObjectName = readRootObjectName(node.callee.object);
  return rootObjectName !== null && API_CLIENT_NAMES.has(rootObjectName);
}

function isStateSetterCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    STATE_SETTER_PATTERN.test(node.callee.name) &&
    !TIMER_FUNCTIONS.has(node.callee.name)
  );
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid fetching in an effect and storing the result in React state.' },
    schema: [],
    messages: { serverStateInUseState: MESSAGE },
  },
  create(context) {
    if (!isSiteFile(context.filename)) {
      return {};
    }
    return {
      CallExpression(node) {
        if (!isUseEffectCallee(node.callee) || node.arguments.length === 0) {
          return;
        }
        const [effectCallback] = node.arguments;
        let hasServerRead = false;
        let hasStateWrite = false;
        forEachDescendant(effectCallback, (descendant) => {
          hasServerRead ||= isServerReadCall(descendant);
          hasStateWrite ||= isStateSetterCall(descendant);
        });
        if (hasServerRead && hasStateWrite) {
          context.report({ node, messageId: 'serverStateInUseState' });
        }
      },
    };
  },
};
