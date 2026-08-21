import { forEachDescendant } from './ast-walk.js';

const MESSAGE =
  'This refetches a key the same mutation optimistically wrote, which adds no data and can ' +
  'revert the user interface: an immediate `GET` after the write may be served by another ' +
  'Lambda on another DSQL connection that still sees the pre-commit snapshot. Reconcile from ' +
  'the mutation response instead. Refetching a key this mutation did not write is allowed, and ' +
  'is how a projection the client cannot derive stays honest. ' +
  'See docs/standards/06-data-fetching.md.';

const REFETCHING_METHOD_NAMES = new Set(['invalidateQueries', 'refetchQueries']);
const WRITING_METHOD_NAMES = new Set(['setQueryData', 'setQueriesData']);

const FUNCTION_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'FunctionDeclaration',
]);

const DYNAMIC_SEGMENT = null;
const UNRESOLVED_KEY = null;

function unwrapAssertion(node) {
  return node !== null && node !== undefined && node.type === 'TSAsExpression'
    ? unwrapAssertion(node.expression)
    : node;
}

function calledMethodName(node) {
  return node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier'
    ? node.callee.property.name
    : null;
}

/**
 * @Blueprint lint-rule-key-factory-model
 * @BlueprintName Query Key Factory Model
 * @BlueprintUsage Use when a rule has to decide whether two TanStack Query keys overlap, which is what tells a refetch of the written key from a refetch of a sibling.
 * @BlueprintDescription Expands each member of a key factory into its segments by following the spreads back to `all`, so `list()` reads as `['editions','list']` and an argument reads as a segment that matches anything. Overlap is then the prefix test TanStack itself applies. A member it cannot expand, and a factory declared in another file, both resolve to nothing rather than to an empty path, so the caller treats them as possibly overlapping instead of provably disjoint.
 */
function modelKeyFactories(programBody) {
  const factories = new Map();
  for (const statement of programBody) {
    const declaration =
      statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (declaration === null || declaration.type !== 'VariableDeclaration') continue;
    for (const declarator of declaration.declarations) {
      const initialiser = unwrapAssertion(declarator.init);
      if (declarator.id.type !== 'Identifier' || initialiser?.type !== 'ObjectExpression') continue;
      const members = new Map();
      for (const property of initialiser.properties) {
        if (property.type !== 'Property' || property.key.type !== 'Identifier') continue;
        members.set(property.key.name, property.value);
      }
      if (members.size > 0) factories.set(declarator.id.name, members);
    }
  }
  return factories;
}

function segmentsOfArray(elements, factories, factoryName, expanding) {
  const segments = [];
  for (const element of elements) {
    if (element === null) return UNRESOLVED_KEY;
    if (element.type === 'SpreadElement') {
      const spread = expandMember(element.argument, factories, factoryName, expanding);
      if (spread === UNRESOLVED_KEY) return UNRESOLVED_KEY;
      segments.push(...spread);
      continue;
    }
    segments.push(element.type === 'Literal' ? String(element.value) : DYNAMIC_SEGMENT);
  }
  return segments;
}

function expandMember(expression, factories, defaultFactoryName, expanding) {
  const target = unwrapAssertion(expression);
  const reference =
    target?.type === 'CallExpression' ? unwrapAssertion(target.callee) : (target ?? null);
  if (
    reference === null ||
    reference.type !== 'MemberExpression' ||
    reference.object.type !== 'Identifier' ||
    reference.property.type !== 'Identifier'
  ) {
    return UNRESOLVED_KEY;
  }
  const factoryName = reference.object.name;
  const memberName = reference.property.name;
  if (factoryName !== defaultFactoryName && !factories.has(factoryName)) return UNRESOLVED_KEY;
  return segmentsOfMember(factoryName, memberName, factories, expanding);
}

function segmentsOfMember(factoryName, memberName, factories, expanding) {
  const signature = `${factoryName}.${memberName}`;
  if (expanding.has(signature)) return UNRESOLVED_KEY;
  const members = factories.get(factoryName);
  const declaration = members?.get(memberName);
  if (declaration === undefined) return UNRESOLVED_KEY;
  const body = unwrapAssertion(
    FUNCTION_TYPES.has(declaration.type) ? declaration.body : declaration,
  );
  if (body?.type !== 'ArrayExpression') return UNRESOLVED_KEY;
  expanding.add(signature);
  const segments = segmentsOfArray(body.elements, factories, factoryName, expanding);
  expanding.delete(signature);
  return segments;
}

function segmentsOfKeyExpression(expression, factories, aliases) {
  const target = unwrapAssertion(expression);
  if (target?.type === 'Identifier') {
    const aliased = aliases.get(target.name);
    return aliased === undefined ? UNRESOLVED_KEY : aliased;
  }
  return expandMember(target, factories, null, new Set());
}

function coversWrittenKey(refetched, written) {
  if (refetched === UNRESOLVED_KEY || written === UNRESOLVED_KEY) return true;
  if (refetched.length > written.length) return false;
  return refetched.every(
    (segment, index) =>
      segment === DYNAMIC_SEGMENT ||
      written[index] === DYNAMIC_SEGMENT ||
      segment === written[index],
  );
}

function queryKeyArgumentOf(call) {
  const [argument] = call.arguments;
  const filters = unwrapAssertion(argument);
  if (filters === undefined || filters === null) return UNRESOLVED_KEY;
  if (filters.type !== 'ObjectExpression') return UNRESOLVED_KEY;
  for (const property of filters.properties) {
    if (
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      property.key.name === 'queryKey'
    ) {
      return property.value;
    }
  }
  return UNRESOLVED_KEY;
}

function collectKeyAliases(scopeNode, factories) {
  const aliases = new Map();
  const record = (node) => {
    if (
      node.type !== 'VariableDeclarator' ||
      node.id.type !== 'Identifier' ||
      node.init === null ||
      node.init === undefined
    ) {
      return;
    }
    aliases.set(node.id.name, expandMember(node.init, factories, null, new Set()));
  };
  forEachDescendant(scopeNode, record);
  return aliases;
}

function collectWrittenKeys(onMutateNode, factories) {
  if (onMutateNode === undefined) return [UNRESOLVED_KEY];
  const aliases = collectKeyAliases(onMutateNode, factories);
  const written = [];
  const record = (node) => {
    const method = calledMethodName(node);
    if (method === null || !WRITING_METHOD_NAMES.has(method)) return;
    const [first] = node.arguments;
    if (first === undefined) return;
    const keyExpression =
      method === 'setQueriesData' ? queryKeyArgumentOf(node) : (first ?? UNRESOLVED_KEY);
    written.push(
      keyExpression === UNRESOLVED_KEY
        ? UNRESOLVED_KEY
        : segmentsOfKeyExpression(keyExpression, factories, aliases),
    );
  };
  forEachDescendant(onMutateNode, record);
  return written;
}

function collectRefetches(scopeNode, factories, refetchingHelpers) {
  const aliases = collectKeyAliases(scopeNode, factories);
  const refetches = [];
  const record = (node) => {
    if (node.type !== 'CallExpression') return;
    const method = calledMethodName(node);
    if (method !== null && REFETCHING_METHOD_NAMES.has(method)) {
      const keyExpression = queryKeyArgumentOf(node);
      refetches.push({
        node,
        key:
          keyExpression === UNRESOLVED_KEY
            ? UNRESOLVED_KEY
            : segmentsOfKeyExpression(keyExpression, factories, aliases),
      });
      return;
    }
    if (node.callee.type !== 'Identifier') return;
    for (const key of refetchingHelpers.get(node.callee.name) ?? []) {
      refetches.push({ node, key });
    }
  };
  record(scopeNode);
  forEachDescendant(scopeNode, record);
  return refetches;
}

function declaredFunctionName(node) {
  if (node.type === 'FunctionDeclaration' && node.id !== null) return node.id.name;
  if (
    node.type === 'VariableDeclarator' &&
    node.id.type === 'Identifier' &&
    node.init !== null &&
    node.init !== undefined &&
    FUNCTION_TYPES.has(node.init.type)
  ) {
    return node.id.name;
  }
  return null;
}

function mutationOptionsOf(node) {
  const isMutationCall =
    (node.callee.type === 'Identifier' && node.callee.name === 'useMutation') ||
    (node.callee.type === 'MemberExpression' &&
      node.callee.property.type === 'Identifier' &&
      node.callee.property.name === 'useMutation');
  if (!isMutationCall) return null;
  const [options] = node.arguments;
  return options !== undefined && options.type === 'ObjectExpression' ? options : null;
}

function propertyValue(options, name) {
  for (const property of options.properties) {
    if (
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      property.key.name === name
    ) {
      return property.value;
    }
  }
  return undefined;
}

/**
 * @Blueprint lint-rule-transitive-call
 * @BlueprintName Transitive Call Detection
 * @BlueprintUsage Use when a rule bans an operation that a helper in the same file can perform on the banned site's behalf.
 * @BlueprintDescription Names every same-file function whose body performs the banned operation, carrying forward what the rule needs to judge it, and only then walks the banned sites, treating a call to one of those names exactly like the operation itself. Deciding at `Program:exit` is what lets a helper declared below its caller count, and it is what stops the rule being defeated by the move a reader makes when a linter complains, which is to extract the call and give the helper a name asserting a property its body does not have.
 */
// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Reject a refetch of a query key the same mutation optimistically wrote.',
    },
    schema: [],
    messages: { refetchAfterOptimisticWrite: MESSAGE },
  },
  create(context) {
    const optimisticMutationOptions = [];
    const declaredFunctions = [];
    let factories = new Map();

    return {
      Program(node) {
        factories = modelKeyFactories(node.body);
      },
      ':function'(node) {
        const name = declaredFunctionName(node.parent) ?? declaredFunctionName(node);
        if (name !== null) declaredFunctions.push({ name, node });
      },
      CallExpression(node) {
        const options = mutationOptionsOf(node);
        if (options !== null && propertyValue(options, 'onMutate') !== undefined) {
          optimisticMutationOptions.push(options);
        }
      },
      'Program:exit'() {
        const refetchingHelpers = new Map();
        for (const { name, node } of declaredFunctions) {
          const refetches = collectRefetches(node, factories, new Map());
          if (refetches.length > 0)
            refetchingHelpers.set(
              name,
              refetches.map((one) => one.key),
            );
        }
        for (const options of optimisticMutationOptions) {
          const written = collectWrittenKeys(propertyValue(options, 'onMutate'), factories);
          for (const refetch of collectRefetches(options, factories, refetchingHelpers)) {
            if (!written.some((key) => coversWrittenKey(refetch.key, key))) continue;
            context.report({ node: refetch.node, messageId: 'refetchAfterOptimisticWrite' });
          }
        }
      },
    };
  },
};
