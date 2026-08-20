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

function isImpureGlobalRead(scope, name) {
  for (let current = scope; current !== null; current = current.upper) {
    if (current.set.has(name)) {
      return current.type === 'global';
    }
  }
  return true;
}

function readModuleScope(sourceCode, program) {
  const scope = sourceCode.getScope(program);
  const [child] = scope.childScopes;
  return child?.type === 'module' ? child : scope;
}

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
