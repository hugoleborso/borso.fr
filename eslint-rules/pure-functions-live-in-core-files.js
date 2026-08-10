import {
  areInterchangeable,
  isLookupTableSwitch,
  isPlainValue,
  isRefusalGuard,
  isShapeTest,
  isValueReference,
} from './decisions.js';
import {
  IMPURE_GLOBALS,
  IMPURE_MEMBER_CALLS,
  IMPURE_MODULE_SOURCES,
  MUTATING_METHOD_NAMES,
  isClockReadingDateConstruction,
  isComponentName,
  isFunctionNode,
  isPureFile,
  isReactHookName,
  isTestPath,
  readFunctionName,
  readMemberCallName,
} from './impurity.js';

/**
 * The other half of `conditions-live-in-pure-functions`. That rule says a
 * branch belongs in a pure function, and the present rule says a pure function
 * belongs in a `.core.ts` or `.utils.ts` file, where the coverage gate and the
 * mutation gate can find it.
 *
 * A function is reported when it carries at least one decision and shows no
 * sign of impurity. The signs are a deliberate list rather than an analysis,
 * since an analysis that is almost right produces false positives.
 *
 * ## What the list missed, and why it grew
 *
 * The first version read the function's own body for a handful of markers, so
 * it called roughly a third of what it reported pure when it was not. A
 * repository encoder that writes `arg.venue = …`, a Lambda entry point that
 * memoises its client in a module level `let`, a CDK helper that calls
 * `fs.readdirSync`, and an `async` function with no `await` were all reported
 * as pure helpers. Moving any of them into a `.core.ts` file would have moved
 * the impurity with them, which is the opposite of what the standard asks.
 *
 * The markers now are:
 *
 * 1. `await`, `yield`, JSX, `new Date()` with no argument, an impure global,
 *    `Date.now`, `Math.random`, and a call to a React hook, as before.
 * 2. **`async` itself**, whether or not the body awaits. An `async` function
 *    returns a promise, so its caller has to await it, and a promise returning
 *    function in a `.core.ts` file is a contract the coverage gate cannot
 *    check cheaply.
 * 3. **Module level mutable state**, meaning a read or a write of a `let` or a
 *    `var` declared at module scope. A function that memoises into one is a
 *    singleton factory, e.g. `getDatabase` and `getClient`.
 * 4. **A binding imported from an impure module**, see `IMPURE_MODULE_SOURCES`.
 *    `fs`, `crypto` and `child_process` are impure wherever they are called
 *    from.
 * 5. **Mutation of an argument**, meaning `arg.x = …`, `delete arg.x`,
 *    `arg[i] += …`, and a mutating method call such as `arg.push(…)`. The
 *    function writes outside its return value, so it is not pure.
 * 6. **A call to another impure function declared in the same file.** Impurity
 *    propagates along the call graph until it stops changing, so
 *    `readDsqlConfig`, which calls `readEnv`, which reads `process.env`, is
 *    impure. Imported functions stay unknown, and unknown counts as pure,
 *    because guessing at another file's body is the analysis this rule set out
 *    to avoid.
 *
 * ## Two shapes that are pure and still not helpers
 *
 * A function that **returns nothing** decides nothing. It exists for an effect
 * this list may not name, e.g. `applyStandardTags` calls `Tags.of(scope).add`
 * and `buildPragmaAppStack` constructs a stack. Either the return annotation
 * says `void`, `Promise<void>`, `never` or `asserts x is T`, or no `return`
 * carries a value.
 *
 * A **type guard**, meaning a function annotated `value is T`, asks what kind
 * of thing a value is rather than what it means. `conditions-live-in-pure-
 * functions` exempts the same question written inline, e.g. `typeof value ===
 * 'string'` and `Array.isArray(value)`, so naming it does not turn it into a
 * decision.
 *
 * ## A branch is not enough, it has to be a decision
 *
 * The rule used to count any `if`, ternary, `switch`, `&&` or `||`, which
 * reported every row encoder in every repository, because encoding a row is a
 * run of presence tests, e.g. `if ('title' in updates) encoded.title = …`.
 * Those functions are pure, and moving them into a `.core.ts` file would buy a
 * test that asserts `JSON.stringify` was called.
 *
 * So the branch has to be a decision, using the same definition as
 * `conditions-live-in-pure-functions`, in `decisions.js`. A presence or type
 * test, a choice between two plain values, a `switch` used as a lookup table,
 * and a bare `&&` or `||` combining values are all exempt.
 *
 * The one place the two rules differ is the guard clause. The sibling exempts
 * every guard, and leaves this rule to catch a decision written as a chain of
 * guards, e.g. `if (laps > required) { return 'finisher'; } return 'running';`.
 * So only a *refusing* guard is exempt here, meaning one that throws or
 * returns nothing.
 *
 * React components and hooks are exempt, because a component returns a tree
 * and a hook reads render state, so neither is a pure helper even when its
 * body happens to look like one.
 *
 * See docs/standards/02-purity-and-core-files.md.
 */
const MESSAGE =
  'The function `{{name}}` branches and touches nothing outside its arguments, so it is a pure ' +
  'function and belongs in a `.core.ts` or `.utils.ts` file with a sibling test. Pure files ' +
  'carry the coverage and mutation gates, and this file does not. ' +
  'See docs/standards/02-purity-and-core-files.md.';

const IMPURITY_MARKER_TYPES = new Set([
  'AwaitExpression',
  'YieldExpression',
  'JSXElement',
  'JSXFragment',
]);

const NOTHING_RETURN_ANNOTATION_TYPES = new Set([
  'TSVoidKeyword',
  'TSNeverKeyword',
  'TSUndefinedKeyword',
]);

function walk(node, visit) {
  if (node === null || typeof node.type !== 'string') {
    return;
  }
  if (visit(node) === false) {
    return;
  }
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && typeof item?.type === 'string') {
          walk(item, visit);
        }
      }
    } else if (value !== null && typeof value?.type === 'string') {
      walk(value, visit);
    }
  }
}

/**
 * A branch that chooses between behaviours or computes a domain outcome, as
 * opposed to one that handles the shape of a value.
 */
function isDecision(node, sourceCode) {
  switch (node.type) {
    case 'IfStatement': {
      if (isShapeTest(node.test) || isRefusalGuard(node)) {
        return false;
      }
      return !(node.alternate === null && isValueReference(node.test));
    }
    case 'ConditionalExpression': {
      return (
        !isShapeTest(node.test) && !areInterchangeable(node.consequent, node.alternate, sourceCode)
      );
    }
    case 'SwitchStatement': {
      return !isLookupTableSwitch(node);
    }
    // `??` is absence, and `x || 'anonymous'` is a default. Anything else
    // combines two computed tests, which is a branch the coverage gate counts.
    case 'LogicalExpression': {
      if (node.operator === '??') {
        return false;
      }
      return !isShapeTest(node) && !isPlainValue(node.right);
    }
    default: {
      return false;
    }
  }
}

function isCallToHook(callExpression) {
  return callExpression.callee.type === 'Identifier' && isReactHookName(callExpression.callee.name);
}

/** The identifier a member chain starts from, e.g. `row` in `row.a.b`. */
function readRootIdentifierName(node) {
  let current = node;
  while (current.type === 'MemberExpression' || current.type === 'ChainExpression') {
    current = current.type === 'ChainExpression' ? current.expression : current.object;
  }
  return current.type === 'Identifier' ? current.name : null;
}

function collectPatternNames(pattern, names) {
  switch (pattern.type) {
    case 'Identifier': {
      names.add(pattern.name);
      return;
    }
    case 'AssignmentPattern': {
      collectPatternNames(pattern.left, names);
      return;
    }
    case 'RestElement': {
      collectPatternNames(pattern.argument, names);
      return;
    }
    case 'ArrayPattern': {
      for (const element of pattern.elements) {
        if (element !== null) {
          collectPatternNames(element, names);
        }
      }
      return;
    }
    case 'ObjectPattern': {
      for (const property of pattern.properties) {
        collectPatternNames(property.type === 'Property' ? property.value : property, names);
      }
      return;
    }
    default: {
      return;
    }
  }
}

function readParameterNames(functionNode) {
  const names = new Set();
  for (const parameter of functionNode.params) {
    collectPatternNames(parameter, names);
  }
  return names;
}

/** `arg.x = …`, `delete arg.x`, `arg.x++`, and `arg.push(…)`. */
function isArgumentMutation(node, parameterNames) {
  if (node.type === 'AssignmentExpression' || node.type === 'UpdateExpression') {
    const target = node.type === 'AssignmentExpression' ? node.left : node.argument;
    return (
      target.type === 'MemberExpression' && parameterNames.has(readRootIdentifierName(target) ?? '')
    );
  }
  if (node.type === 'UnaryExpression' && node.operator === 'delete') {
    return (
      node.argument.type === 'MemberExpression' &&
      parameterNames.has(readRootIdentifierName(node.argument) ?? '')
    );
  }
  if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') {
    return false;
  }
  const { callee } = node;
  return (
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    MUTATING_METHOD_NAMES.has(callee.property.name) &&
    parameterNames.has(readRootIdentifierName(callee.object) ?? '')
  );
}

/** A `void`, `never`, `undefined`, `Promise<void>` or `asserts x is T` return. */
function hasNothingReturnAnnotation(functionNode) {
  const annotation = functionNode.returnType?.typeAnnotation;
  if (annotation === undefined) {
    return false;
  }
  if (NOTHING_RETURN_ANNOTATION_TYPES.has(annotation.type)) {
    return true;
  }
  if (annotation.type === 'TSTypePredicate') {
    return annotation.asserts === true;
  }
  if (annotation.type !== 'TSTypeReference' || annotation.typeName.type !== 'Identifier') {
    return false;
  }
  const [argument] = annotation.typeArguments?.params ?? [];
  return (
    annotation.typeName.name === 'Promise' &&
    argument !== undefined &&
    NOTHING_RETURN_ANNOTATION_TYPES.has(argument.type)
  );
}

/** Walks the body without descending into a nested function of its own. */
function hasValueReturn(functionNode) {
  if (functionNode.body.type !== 'BlockStatement') {
    return true;
  }
  let isFound = false;
  walk(functionNode.body, (node) => {
    if (node !== functionNode.body && isFunctionNode(node)) {
      return false;
    }
    if (node.type === 'ReturnStatement' && node.argument !== null) {
      isFound = true;
    }
    return true;
  });
  return isFound;
}

function returnsNothing(functionNode) {
  return hasNothingReturnAnnotation(functionNode) || !hasValueReturn(functionNode);
}

function isTypeGuard(functionNode) {
  return functionNode.returnType?.typeAnnotation.type === 'TSTypePredicate';
}

/** A nested function's purity is judged by the function that contains it. */
function hasEnclosingFunction(node) {
  let current = node.parent;
  while (current !== undefined && current !== null) {
    if (isFunctionNode(current)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isWithin(range, outerNode) {
  return range[0] >= outerNode.range[0] && range[1] <= outerNode.range[1];
}

/**
 * Whether `name` reads the impure global rather than something the file
 * declared itself.
 *
 * A parameter named `window`, a local named `process` and an imported `fetch`
 * helper are declarations, so the read is not a read of the global. A name
 * the file never declares resolves either nowhere or to the global scope,
 * which is where `languageOptions.globals` puts the browser and Node names.
 */
function isImpureGlobalRead(scope, name) {
  for (let current = scope; current !== null; current = current.upper) {
    if (current.set.has(name)) {
      return current.type === 'global';
    }
  }
  return true;
}

/**
 * The scope a module's own declarations live in.
 *
 * `getScope(Program)` answers the global scope, whose only child is the module
 * scope, and every `import` and every top level `let` is declared in the
 * child. Reading the parent instead would find no variables at all.
 */
function readModuleScope(sourceCode, program) {
  const scope = sourceCode.getScope(program);
  const [child] = scope.childScopes;
  return child?.type === 'module' ? child : scope;
}

/**
 * Module scope bindings a pure function may not touch, as reference ranges.
 *
 * A `let` or a `var` at module scope is mutable state, and a binding imported
 * from `node:fs` reaches the file system. Scope analysis rather than a name
 * match, so a parameter that shadows one of them does not count.
 */
function collectImpureBindingRanges(moduleScope) {
  const ranges = [];
  for (const variable of moduleScope.variables) {
    const [definition] = variable.defs;
    if (definition === undefined) {
      continue;
    }
    const isMutableState = definition.type === 'Variable' && definition.parent.kind !== 'const';
    const isImpureImport =
      definition.type === 'ImportBinding' &&
      IMPURE_MODULE_SOURCES.has(definition.parent.source.value);
    if (!isMutableState && !isImpureImport) {
      continue;
    }
    for (const reference of variable.references) {
      ranges.push(reference.identifier.range);
    }
  }
  return ranges;
}

/**
 * Every module scope function, by name, with the ranges from which it is
 * referenced. The reference ranges are what turns "who calls whom" into a
 * question about node positions, which needs no scope walking of its own.
 */
function collectModuleFunctions(moduleScope) {
  const functions = new Map();
  for (const variable of moduleScope.variables) {
    const [definition] = variable.defs;
    if (definition === undefined) {
      continue;
    }
    const candidate =
      definition.type === 'FunctionName'
        ? definition.node
        : definition.type === 'Variable'
          ? definition.node.init
          : null;
    if (candidate === null || candidate === undefined || !isFunctionNode(candidate)) {
      continue;
    }
    functions.set(variable.name, {
      node: candidate,
      referenceRanges: variable.references.map((reference) => reference.identifier.range),
    });
  }
  return functions;
}

/**
 * Marks a function impure when it calls an impure one from the same file,
 * repeatedly, because the callee may itself only become impure on a later
 * pass. The graph is one file wide, so the loop settles in a few passes.
 */
function spreadImpurityAlongCallGraph(moduleFunctions, findings) {
  let hasChanged = true;
  while (hasChanged) {
    hasChanged = false;
    for (const { node, referenceRanges } of moduleFunctions.values()) {
      if (findings.get(node)?.hasImpurityMarker !== true) {
        continue;
      }
      for (const caller of moduleFunctions.values()) {
        const finding = findings.get(caller.node);
        if (
          finding === undefined ||
          finding.hasImpurityMarker ||
          !referenceRanges.some((range) => isWithin(range, caller.node))
        ) {
          continue;
        }
        finding.hasImpurityMarker = true;
        hasChanged = true;
      }
    }
  }
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require pure functions to live in a `.core.ts` or `.utils.ts` file.' },
    schema: [],
    messages: { moveToPureFile: MESSAGE },
  },
  create(context) {
    const { filename, sourceCode } = context;
    if (isPureFile(filename) || isTestPath(filename)) {
      return {};
    }

    const candidates = [];

    function inspectFunctionBody(functionNode, impureBindingRanges) {
      let hasDecision = false;
      let hasImpurityMarker = functionNode.async === true;
      const parameterNames = readParameterNames(functionNode);

      walk(functionNode.body, (node) => {
        if (isDecision(node, sourceCode)) {
          hasDecision = true;
        }
        if (IMPURITY_MARKER_TYPES.has(node.type)) {
          hasImpurityMarker = true;
        }
        if (isClockReadingDateConstruction(node)) {
          hasImpurityMarker = true;
        }
        if (
          node.type === 'Identifier' &&
          IMPURE_GLOBALS.has(node.name) &&
          isImpureGlobalRead(sourceCode.getScope(node), node.name)
        ) {
          hasImpurityMarker = true;
        }
        const memberCallName = readMemberCallName(node);
        if (memberCallName !== null && IMPURE_MEMBER_CALLS.has(memberCallName)) {
          hasImpurityMarker = true;
        }
        if (node.type === 'CallExpression' && isCallToHook(node)) {
          hasImpurityMarker = true;
        }
        if (node.type === 'MetaProperty') {
          hasImpurityMarker = true;
        }
        if (isArgumentMutation(node, parameterNames)) {
          hasImpurityMarker = true;
        }
        return true;
      });

      if (impureBindingRanges.some((range) => isWithin(range, functionNode))) {
        hasImpurityMarker = true;
      }

      return { hasDecision, hasImpurityMarker };
    }

    function collect(node) {
      if (hasEnclosingFunction(node)) {
        return;
      }
      candidates.push(node);
    }

    return {
      FunctionDeclaration: collect,
      FunctionExpression: collect,
      ArrowFunctionExpression: collect,
      'Program:exit'(program) {
        const moduleScope = readModuleScope(sourceCode, program);
        const impureBindingRanges = collectImpureBindingRanges(moduleScope);
        const moduleFunctions = collectModuleFunctions(moduleScope);

        const findings = new Map();
        for (const node of [
          ...candidates,
          ...[...moduleFunctions.values()].map((entry) => entry.node),
        ]) {
          if (!findings.has(node)) {
            findings.set(node, inspectFunctionBody(node, impureBindingRanges));
          }
        }
        spreadImpurityAlongCallGraph(moduleFunctions, findings);

        for (const node of candidates) {
          const name = readFunctionName(node);
          if (name === null || isReactHookName(name) || isComponentName(name)) {
            continue;
          }
          if (returnsNothing(node) || isTypeGuard(node)) {
            continue;
          }
          const { hasDecision, hasImpurityMarker } = findings.get(node);
          if (hasDecision && !hasImpurityMarker) {
            context.report({ node, messageId: 'moveToPureFile', data: { name } });
          }
        }
      },
    };
  },
};
