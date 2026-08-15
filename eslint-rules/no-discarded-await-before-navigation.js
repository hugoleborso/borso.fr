/**
 * An optimistic write is only optimistic if the interface moves before the
 * server answers. `onMutate` writing the cache is half of it; the other half is
 * the caller not standing still. `await save.mutateAsync(payload)` followed by
 * `navigateTo(...)` parks the operator on the form for the whole round trip and
 * shows them nothing, which is exactly the bug the optimistic write was added
 * to prevent — reported on pragma as "updating the artist does no optimistic
 * update", against a mutation whose `onMutate` had been patching both caches
 * correctly all along.
 *
 * The discriminator is whether the awaited value is used. A create awaits
 * because the route it navigates to needs the server-issued id:
 *
 *   const created = await createSong.mutateAsync(payload);
 *   navigateTo(`/catalog/${created.song.id}`);
 *
 * An update has nothing to wait for, so the await is pure latency:
 *
 *   await updateSong.mutateAsync({ id, ...payload });   // flagged
 *   navigateTo(`/catalog/${id}`);
 *
 * So the rule reports an `await` of a mutation whose result is discarded when a
 * navigation follows it in the same block. Rewrite as `mutate(...)` and
 * navigate, and surface a failed write where the operator now is.
 *
 * It reports only writes the cache can answer for: the receiver has to come
 * from a `useCreate…` / `useUpdate…` / `useDelete…` hook in the same file. A
 * login is the shape this excludes on purpose — `await login.mutateAsync(...)`
 * then navigate is correct, because there is no optimistic cache standing in
 * for the session and a wrong password has to keep the operator on the form.
 *
 * See docs/dantotsus/the-optimistic-update-nobody-could-see.md.
 */

const MESSAGE =
  'This awaits a write whose result is discarded, then navigates — so the operator waits out ' +
  'the round trip and never sees the optimistic update. Call `mutate(...)` and navigate ' +
  'immediately, and surface a failed write on the page they land on. Keep the `await` only ' +
  'when you use what it returns (a create needs the server-issued id). ' +
  'See docs/dantotsus/the-optimistic-update-nobody-could-see.md.';

const MUTATION_METHODS = new Set(['mutateAsync']);
const NAVIGATION_PATTERN = /^(navigate|push|replace|redirect)/i;
const ENTITY_WRITE_HOOK_PATTERN = /^use(Create|Update|Delete)/;

function readReceiverName(node) {
  if (node?.type !== 'CallExpression') return null;
  const { callee } = node;
  if (callee.type !== 'MemberExpression') return null;
  if (callee.property.type !== 'Identifier') return null;
  if (!MUTATION_METHODS.has(callee.property.name)) return null;
  return callee.object.type === 'Identifier' ? callee.object.name : null;
}

/**
 * True when the receiver was declared in scope from an entity-write hook, which
 * is what tells us a cache already holds the new values. An unresolvable
 * receiver is left alone rather than guessed at.
 */
function isEntityWriteReceiver(context, node, receiverName) {
  let scope = context.sourceCode.getScope(node);
  while (scope !== null) {
    const variable = scope.variables.find((candidate) => candidate.name === receiverName);
    const initializer = variable?.defs[0]?.node?.init;
    if (initializer?.type === 'CallExpression' && initializer.callee.type === 'Identifier') {
      return ENTITY_WRITE_HOOK_PATTERN.test(initializer.callee.name);
    }
    scope = scope.upper;
  }
  return false;
}

/** An `await` whose value nobody reads: the whole statement is the await. */
function isDiscardedAwaitOfMutation(context, statement) {
  if (statement.type !== 'ExpressionStatement') return false;
  if (statement.expression.type !== 'AwaitExpression') return false;
  const receiverName = readReceiverName(statement.expression.argument);
  if (receiverName === null) return false;
  return isEntityWriteReceiver(context, statement, receiverName);
}

function readCalleeName(callee) {
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return null;
}

function isNavigation(node) {
  if (node?.type !== 'CallExpression') return false;
  const name = readCalleeName(node.callee);
  return name !== null && NAVIGATION_PATTERN.test(name);
}

function statementNavigates(statement) {
  if (statement.type !== 'ExpressionStatement') return false;
  const { expression } = statement;
  if (isNavigation(expression)) return true;
  return expression.type === 'AwaitExpression' && isNavigation(expression.argument);
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Reject awaiting a write whose result is discarded when a navigation follows, which hides the optimistic update.',
    },
    schema: [],
    messages: { discardedAwait: MESSAGE },
  },
  create(context) {
    function inspectBody(statements) {
      statements.forEach((statement, index) => {
        if (!isDiscardedAwaitOfMutation(context, statement)) return;
        const follower = statements[index + 1];
        if (follower === undefined) return;
        if (!statementNavigates(follower)) return;
        context.report({ node: statement, messageId: 'discardedAwait' });
      });
    }

    return {
      BlockStatement(node) {
        inspectBody(node.body);
      },
    };
  },
};
