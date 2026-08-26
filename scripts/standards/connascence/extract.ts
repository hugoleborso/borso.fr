import { basename } from 'node:path';
import ts from 'typescript';
import { resolveRelativeImport } from './source-facts';
import {
  collectMutableState,
  countPositionalParameters,
  digestOfBody,
  isExported,
  isModuleScope,
  isNamedConstant,
  isSkippableLiteralPosition,
  lineOf,
  MINIMUM_BODY_TOKENS,
  MINIMUM_REGEX_LENGTH,
  MINIMUM_STRING_LENGTH,
  namedOwnerOf,
  PUNCTUATION_ONLY,
  TRIVIAL_NUMBERS,
} from './ast-facts';
import {
  CDK_DURATION_OBJECT,
  collectTemporalFromText,
  SCHEDULING_CALLS,
  SCHEDULING_DELAY_ARGUMENT,
  UNIT_OF_CDK_DURATION,
  UNIT_OF_PROPERTY,
  unitOfConstantName,
} from './temporal-facts';
import {
  CACHE_METHODS,
  calleeNameOf,
  KEY_FACTORY_SUFFIX,
  numericValueOf,
  QUERY_HOOKS,
  queryKeyArgumentOf,
  rootKeyOf,
} from './cache-facts';
import type {
  BodySite,
  CacheTouchSite,
  LiteralSite,
  MutableStateSite,
  QueryReadSite,
  RegexSite,
  SignatureSite,
  TemporalSite,
  UnionSite,
} from './connascence.types';

export interface Extraction {
  readonly temporal: TemporalSite[];
  readonly cacheTouches: CacheTouchSite[];
  readonly queryReads: QueryReadSite[];
  readonly keyDeclarations: [string, string][];
  readonly literals: LiteralSite[];
  readonly regexes: RegexSite[];
  readonly bodies: BodySite[];
  readonly signatures: SignatureSite[];
  readonly unions: UnionSite[];
  readonly states: MutableStateSite[];
  readonly imports: string[];
}

export function extract(
  path: string,
  text: string,
  externalVocabulary: ReadonlySet<string>,
): Extraction {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result: Extraction = {
    temporal: [],
    cacheTouches: [],
    queryReads: [],
    keyDeclarations: [],
    literals: [],
    regexes: [],
    bodies: [],
    signatures: [],
    unions: [],
    states: [],
    imports: [],
  };
  const mutableNames = new Map<string, number>();

  const visit = (node: ts.Node, holder: string | null): void => {
    const owner = namedOwnerOf(node) ?? holder;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      result.temporal.push(...collectTemporalFromText(path, lineOf(source, node), node.text));
    }
    if (ts.isCallExpression(node)) {
      const callee = calleeNameOf(node);
      if (callee !== null && SCHEDULING_CALLS.has(callee)) {
        const delay = numericValueOf(node.arguments[SCHEDULING_DELAY_ARGUMENT] ?? node);
        if (delay !== null) {
          result.temporal.push({
            path,
            line: lineOf(source, node),
            milliseconds: delay,
            expression: `${callee}(…, ${String(delay)})`,
          });
        }
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === CDK_DURATION_OBJECT
      ) {
        const unit = UNIT_OF_CDK_DURATION[node.expression.name.text];
        const amount = numericValueOf(node.arguments[0] ?? node);
        if (unit !== undefined && amount !== null) {
          result.temporal.push({
            path,
            line: lineOf(source, node),
            milliseconds: amount * unit,
            expression: `Duration.${node.expression.name.text}(${String(amount)})`,
          });
        }
      }
      if (callee !== null && CACHE_METHODS.has(callee)) {
        const root = rootKeyOf(queryKeyArgumentOf(node) ?? node);
        if (root !== null) {
          result.cacheTouches.push({
            path,
            line: lineOf(source, node),
            owner: owner ?? basename(path),
            root,
            method: callee,
          });
        }
      }
      if (callee !== null && QUERY_HOOKS.has(callee)) {
        const root = rootKeyOf(queryKeyArgumentOf(node) ?? node);
        if (root !== null) result.queryReads.push({ path, root });
      }
    }
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      UNIT_OF_PROPERTY[node.name.text] !== undefined
    ) {
      const amount = numericValueOf(node.initializer);
      const unit = UNIT_OF_PROPERTY[node.name.text];
      if (amount !== null && unit !== undefined) {
        result.temporal.push({
          path,
          line: lineOf(source, node),
          milliseconds: amount * unit,
          expression: `${node.name.text}: ${String(amount)}`,
        });
      }
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isModuleScope(node)) {
      const unit = unitOfConstantName(node.name.text);
      const amount = node.initializer === undefined ? null : numericValueOf(node.initializer);
      if (unit !== null && amount !== null) {
        result.temporal.push({
          path,
          line: lineOf(source, node),
          milliseconds: amount * unit,
          expression: `${node.name.text} = ${String(amount)}`,
        });
      }
      if (node.name.text.endsWith(KEY_FACTORY_SUFFIX)) {
        result.keyDeclarations.push([node.name.text, path]);
      }
    }
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const resolved = resolveRelativeImport(path, node.moduleSpecifier.text);
      if (resolved !== null) result.imports.push(resolved);
    }
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      !isSkippableLiteralPosition(node) &&
      node.text.length >= MINIMUM_STRING_LENGTH &&
      !PUNCTUATION_ONLY.test(node.text) &&
      !externalVocabulary.has(node.text)
    ) {
      result.literals.push({
        path,
        value: JSON.stringify(node.text),
        line: lineOf(source, node),
        named: isNamedConstant(node),
      });
    }
    if (
      ts.isNumericLiteral(node) &&
      !isSkippableLiteralPosition(node) &&
      !TRIVIAL_NUMBERS.has(node.text)
    ) {
      result.literals.push({
        path,
        value: node.text,
        line: lineOf(source, node),
        named: isNamedConstant(node),
      });
    }
    if (ts.isRegularExpressionLiteral(node) && node.text.length >= MINIMUM_REGEX_LENGTH) {
      result.regexes.push({ path, source: node.text, line: lineOf(source, node) });
    }
    if (
      ts.isTypeAliasDeclaration(node) &&
      ts.isUnionTypeNode(node.type) &&
      node.type.types.length > 1 &&
      node.type.types.every(
        (member) => ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal),
      )
    ) {
      result.unions.push({
        path,
        name: node.name.text,
        members: node.type.types.flatMap((member) =>
          ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal)
            ? [JSON.stringify(member.literal.text)]
            : [],
        ),
        line: lineOf(source, node),
      });
    }
    if (
      ts.isVariableStatement(node) &&
      ts.isSourceFile(node.parent) &&
      (node.declarationList.flags & ts.NodeFlags.Const) === 0
    ) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          mutableNames.set(declaration.name.text, lineOf(source, declaration));
        }
      }
    }
    if (ts.isFunctionDeclaration(node) && node.name !== undefined && node.body !== undefined) {
      const measured = digestOfBody(source, node.body);
      if (measured.tokens >= MINIMUM_BODY_TOKENS) {
        result.bodies.push({
          path,
          name: node.name.text,
          digest: measured.digest,
          tokens: measured.tokens,
          lines: node.body.getText(source).split('\n').length,
          line: lineOf(source, node),
        });
      }
      if (isExported(node)) {
        result.signatures.push({
          path,
          name: node.name.text,
          arity: countPositionalParameters(node.parameters),
          line: lineOf(source, node),
        });
      }
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      ts.isArrowFunction(node.initializer) &&
      isModuleScope(node) &&
      ts.isVariableStatement(node.parent.parent) &&
      isExported(node.parent.parent)
    ) {
      result.signatures.push({
        path,
        name: node.name.text,
        arity: countPositionalParameters(node.initializer.parameters),
        line: lineOf(source, node),
      });
    }
    ts.forEachChild(node, (child) => {
      visit(child, owner);
    });
  };
  visit(source, null);
  result.states.push(...collectMutableState(source, path, mutableNames));
  return result;
}
