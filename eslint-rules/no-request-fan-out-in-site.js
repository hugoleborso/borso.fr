import { isSiteFile } from './site-paths.js';

const MESSAGE_FAN_OUT =
  'One request per item grows with the number of items, and the API serves 10 at once. ' +
  'A batch folds at most 10 reads, so a longer list becomes several batches and one database ' +
  'read per item. Read the collection in one request, or seed per-item keys from a list ' +
  'response with `setQueryData`. See docs/standards/06-data-fetching.md.';

const MESSAGE_AWAITED_IN_LOOP =
  'Each awaited read waits for the one before, so N reads take N round trips and never share ' +
  'a batch. Read the collection in one request. See docs/standards/06-data-fetching.md.';

const REQUEST_METHOD_NAMES = new Set([
  '$get',
  '$post',
  '$put',
  '$patch',
  '$delete',
  'query',
  'fetchQuery',
  'prefetchQuery',
  'ensureQueryData',
]);
const READ_METHOD_NAMES = new Set([
  '$get',
  'query',
  'fetchQuery',
  'prefetchQuery',
  'ensureQueryData',
]);
const FETCH_FUNCTION_NAME = 'fetch';
const ITERATION_METHOD_NAMES = new Set([
  'map',
  'flatMap',
  'forEach',
  'reduce',
  'reduceRight',
  'filter',
  'find',
  'findIndex',
  'findLast',
  'findLastIndex',
  'some',
  'every',
]);
const QUERIES_HOOK_NAMES = new Set(['useQueries', 'useSuspenseQueries']);
const QUERIES_PROPERTY_NAME = 'queries';
const DEFERRED_REQUEST_PROPERTY_NAME = 'queryFn';
const PARENT_KEY = 'parent';

const FUNCTION_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'FunctionDeclaration',
]);
const LOOP_TYPES = new Set([
  'ForStatement',
  'ForOfStatement',
  'ForInStatement',
  'WhileStatement',
  'DoWhileStatement',
]);

function isAstNode(value) {
  return typeof value === 'object' && value !== null && typeof value.type === 'string';
}

function isQueryFunctionValue(node) {
  const { parent } = node;
  return (
    parent?.type === 'Property' &&
    parent.value === node &&
    parent.key.type === 'Identifier' &&
    parent.key.name === DEFERRED_REQUEST_PROPERTY_NAME
  );
}

function forEachCallReached(node, visit) {
  for (const key of Object.keys(node)) {
    if (key === PARENT_KEY) continue;
    const value = node[key];
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (!isAstNode(child)) continue;
      if (FUNCTION_TYPES.has(child.type) && !isQueryFunctionValue(child)) continue;
      if (child.type === 'CallExpression') visit(child);
      forEachCallReached(child, visit);
    }
  }
}

function calledMethodName(call) {
  return call.callee.type === 'MemberExpression' && call.callee.property.type === 'Identifier'
    ? call.callee.property.name
    : null;
}

function calledFunctionName(call) {
  return call.callee.type === 'Identifier' ? call.callee.name : null;
}

function isRequestCall(call) {
  return (
    calledFunctionName(call) === FETCH_FUNCTION_NAME ||
    REQUEST_METHOD_NAMES.has(calledMethodName(call) ?? '')
  );
}

function isReadCall(call) {
  return READ_METHOD_NAMES.has(calledMethodName(call) ?? '');
}

function declaredFunctionName(node) {
  if (node.type === 'FunctionDeclaration' && node.id !== null) return node.id.name;
  const { parent } = node;
  if (
    parent?.type === 'VariableDeclarator' &&
    parent.init === node &&
    parent.id.type === 'Identifier'
  ) {
    return parent.id.name;
  }
  return null;
}

function nameSendersOf(declaredFunctions, isOperation) {
  const senders = new Set();
  let hasGrown = true;
  while (hasGrown) {
    hasGrown = false;
    for (const [name, functionNode] of declaredFunctions) {
      if (senders.has(name)) continue;
      let hasOperation = false;
      forEachCallReached(functionNode, (call) => {
        hasOperation ||= reachesOperation(call, senders, isOperation);
      });
      if (hasOperation) {
        senders.add(name);
        hasGrown = true;
      }
    }
  }
  return senders;
}

function callbackSends(callback, senders, isOperation) {
  if (callback === undefined) return false;
  if (callback.type === 'Identifier') return senders.has(callback.name);
  if (!FUNCTION_TYPES.has(callback.type)) return false;
  let hasOperation = false;
  forEachCallReached(callback, (call) => {
    hasOperation ||= reachesOperation(call, senders, isOperation);
  });
  return hasOperation;
}

function reachesOperation(call, senders, isOperation) {
  return isOperation(call) || senders.has(calledFunctionName(call) ?? '');
}

function iterationCallbackOf(call) {
  const method = calledMethodName(call);
  if (method !== null && ITERATION_METHOD_NAMES.has(method)) {
    return { callback: call.arguments[0] };
  }
  const { callee } = call;
  if (method === 'from' && callee.object.type === 'Identifier' && callee.object.name === 'Array') {
    return { callback: call.arguments[1] };
  }
  return null;
}

function mappedQueriesOf(call) {
  const hookName = calledFunctionName(call) ?? calledMethodName(call);
  if (hookName === null || !QUERIES_HOOK_NAMES.has(hookName)) return null;
  const [options] = call.arguments;
  if (options?.type !== 'ObjectExpression') return null;
  for (const property of options.properties) {
    if (
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      property.key.name === QUERIES_PROPERTY_NAME &&
      property.value.type === 'CallExpression' &&
      iterationCallbackOf(property.value) !== null
    ) {
      return property.value;
    }
  }
  return null;
}

function forEachOutermostUnawaitedRequest(node, isRequest, visit) {
  for (const key of Object.keys(node)) {
    if (key === PARENT_KEY) continue;
    const value = node[key];
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (!isAstNode(child) || child.type === 'AwaitExpression') continue;
      if (FUNCTION_TYPES.has(child.type) && !isQueryFunctionValue(child)) continue;
      if (child.type === 'CallExpression' && isRequest(child)) {
        visit(child);
        continue;
      }
      forEachOutermostUnawaitedRequest(child, isRequest, visit);
    }
  }
}

function awaitsRead(call, readSenders) {
  let hasRead = reachesOperation(call, readSenders, isReadCall);
  forEachCallReached(call, (reached) => {
    hasRead ||= reachesOperation(reached, readSenders, isReadCall);
  });
  return hasRead;
}

function isAwaitedInLoopBody(node) {
  for (let current = node; current.parent !== undefined && current.parent !== null;) {
    const { parent } = current;
    if (FUNCTION_TYPES.has(parent.type)) return false;
    if (LOOP_TYPES.has(parent.type) && parent.body === current) return true;
    current = parent;
  }
  return false;
}

// @FollowsBlueprint lint-rule-transitive-call
// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Reject a request per item over an iteration or a loop, and a read awaited inside a loop, in site code.',
    },
    schema: [],
    messages: {
      requestFanOut: MESSAGE_FAN_OUT,
      readAwaitedInLoop: MESSAGE_AWAITED_IN_LOOP,
    },
  },
  create(context) {
    if (!isSiteFile(context.filename)) return {};
    const declaredFunctions = new Map();
    const iterations = [];
    const loops = [];
    const mappedQueries = [];
    const rememberLoop = (node) => loops.push(node);
    const awaitedCalls = [];

    return {
      ':function'(node) {
        const name = declaredFunctionName(node);
        if (name !== null) declaredFunctions.set(name, node);
      },
      CallExpression(node) {
        const iteration = iterationCallbackOf(node);
        if (iteration !== null) iterations.push({ node, callback: iteration.callback });
        const queries = mappedQueriesOf(node);
        if (queries !== null) mappedQueries.push(queries);
      },
      ...Object.fromEntries([...LOOP_TYPES].map((loopType) => [loopType, rememberLoop])),
      AwaitExpression(node) {
        if (node.argument.type === 'CallExpression' && isAwaitedInLoopBody(node)) {
          awaitedCalls.push(node.argument);
        }
      },
      'Program:exit'() {
        const requestSenders = nameSendersOf(declaredFunctions, isRequestCall);
        const readSenders = nameSendersOf(declaredFunctions, isReadCall);
        const reported = new Set();
        for (const queries of mappedQueries) {
          reported.add(queries);
          context.report({ node: queries, messageId: 'requestFanOut' });
        }
        for (const { node, callback } of iterations) {
          if (reported.has(node) || !callbackSends(callback, requestSenders, isRequestCall)) {
            continue;
          }
          context.report({ node, messageId: 'requestFanOut' });
        }
        const sendsRequest = (call) => reachesOperation(call, requestSenders, isRequestCall);
        for (const loop of loops) {
          forEachOutermostUnawaitedRequest(loop.body, sendsRequest, (call) => {
            if (reported.has(call)) return;
            reported.add(call);
            context.report({ node: call, messageId: 'requestFanOut' });
          });
        }
        for (const call of awaitedCalls) {
          if (!awaitsRead(call, readSenders)) continue;
          context.report({ node: call, messageId: 'readAwaitedInLoop' });
        }
      },
    };
  },
};
