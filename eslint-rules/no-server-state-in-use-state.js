import { forEachDescendant } from './ast-walk.js';
import { isSiteFile } from './site-paths.js';
import { isUseEffectCallee } from './no-use-effect.js';

/**
 * Fetching in an effect and writing the result into `useState` is the shape
 * TanStack Query exists to delete. Written by hand it means loading state,
 * error state, caching, deduplication, cancellation on unmount, and refetching
 * on focus, and it means getting one of the six wrong every time.
 *
 * `borso/no-use-effect` already rejects the effect itself. This rule stays
 * separate because it names the replacement, so the author reads "use
 * `useQuery`" rather than "use derived state", and because it survives a
 * `no-use-effect` disable comment written for a different reason.
 *
 * The rule fires only when both halves are present inside one effect callback,
 * which is a server read and a state setter. What it deliberately allows:
 *
 * - An effect that sets state without reading the server, e.g. a DOM
 *   measurement, since `no-use-effect` is what covers that.
 * - An effect that reads the server without setting state, e.g. a fire and
 *   forget analytics ping.
 * - `setTimeout`, `setInterval`, and `setImmediate`, which match the
 *   `set<Uppercase>` shape and are not state setters.
 * - A fetch and a setter in an event handler, which is where the standard
 *   wants the work when it is not a query.
 *
 * See docs/standards/06-data-fetching.md and
 * docs/standards/07-state-and-effects.md.
 */
const MESSAGE =
  'This effect reads the server and writes the result into React state. Server state lives in ' +
  'TanStack Query, so the read is a `useQuery` in `lib/queries/<domain>.ts` and the write is a ' +
  '`useMutation`, both typed by the Hono client. See docs/standards/06-data-fetching.md.';

const STATE_SETTER_PATTERN = /^set[A-Z]/;

/** Names that match the setter shape and schedule work rather than set state. */
const TIMER_FUNCTIONS = new Set(['setTimeout', 'setInterval', 'setImmediate']);

/** The Hono client's request methods, e.g. `api.api.songs.$get()`. */
const HONO_REQUEST_METHODS = new Set(['$get', '$post', '$put', '$patch', '$delete']);

/** Identifiers a front end binds the Hono client to. */
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
