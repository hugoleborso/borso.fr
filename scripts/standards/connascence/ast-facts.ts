import { createHash } from 'node:crypto';
import ts from 'typescript';
import type { MutableStateSite } from './connascence.types';

export const MINIMUM_STRING_LENGTH = 3;
export const TRIVIAL_NUMBERS = new Set(['0', '1', '2']);
export const MINIMUM_REGEX_LENGTH = 6;
export const MINIMUM_BODY_TOKENS = 40;
const DIGEST_LENGTH = 12;
export const PUNCTUATION_ONLY = /^[^\p{L}\p{N}]+$/u;

export function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

export function isModuleScope(declaration: ts.VariableDeclaration): boolean {
  const list = declaration.parent;
  const statement = list.parent;
  return statement !== undefined && ts.isSourceFile(statement.parent);
}

export function isSkippableLiteralPosition(node: ts.Node): boolean {
  const parent = node.parent;
  if (parent === undefined) return true;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true;
  if (ts.isLiteralTypeNode(parent)) return true;
  if (ts.isJsxAttribute(parent)) return true;
  if (ts.isJsxExpression(parent) && parent.parent !== undefined && ts.isJsxAttribute(parent.parent))
    return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isEnumMember(parent) && parent.name === node) return true;
  if (isTypeofComparison(parent)) return true;
  return false;
}

export function isTypeofComparison(parent: ts.Node): boolean {
  if (!ts.isBinaryExpression(parent)) return false;
  return ts.isTypeOfExpression(parent.left) || ts.isTypeOfExpression(parent.right);
}

export function isNamedConstant(node: ts.Node): boolean {
  const parent = node.parent;
  if (parent === undefined || !ts.isVariableDeclaration(parent)) return false;
  if (parent.initializer !== node) return false;
  return isModuleScope(parent);
}

interface BodyDigest {
  readonly digest: string;
  readonly tokens: number;
}

export function digestOfBody(source: ts.SourceFile, body: ts.Node): BodyDigest {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.JSX);
  scanner.setText(body.getText(source));
  const pieces: string[] = [];
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    pieces.push(`${String(token)}:${scanner.getTokenText()}`);
    token = scanner.scan();
  }
  return {
    digest: createHash('sha256').update(pieces.join(' ')).digest('hex').slice(0, DIGEST_LENGTH),
    tokens: pieces.length,
  };
}

const THIS_PARAMETER = 'this';

export function countPositionalParameters(
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
): number {
  const relevant = parameters.filter(
    (parameter) => !(ts.isIdentifier(parameter.name) && parameter.name.text === THIS_PARAMETER),
  );
  const only = relevant[0];
  if (relevant.length === 1 && only !== undefined && ts.isObjectBindingPattern(only.name)) return 0;
  return relevant.length;
}

export function isExported(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return (modifiers ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

export function namedOwnerOf(node: ts.Node): string | null {
  if (ts.isFunctionDeclaration(node) && node.name !== undefined) return node.name.text;
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.initializer !== undefined &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
  ) {
    return node.name.text;
  }
  return null;
}

export function collectMutableState(
  source: ts.SourceFile,
  path: string,
  names: ReadonlyMap<string, number>,
): MutableStateSite[] {
  return [...names].map(([name, line]) => {
    const writers = new Set<string>();
    const readers = new Set<string>();
    const walk = (node: ts.Node, holder: string | null): void => {
      const owner = namedOwnerOf(node) ?? holder;
      if (ts.isIdentifier(node) && node.text === name && owner !== null) {
        const parent = node.parent;
        if (
          parent !== undefined &&
          ts.isBinaryExpression(parent) &&
          parent.left === node &&
          parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ) {
          writers.add(owner);
        } else if (parent !== undefined && !ts.isVariableDeclaration(parent)) {
          readers.add(owner);
        }
      }
      ts.forEachChild(node, (child) => {
        walk(child, owner);
      });
    };
    walk(source, null);
    return {
      path,
      name,
      writers: [...writers].filter((holder) => !readers.has(holder)),
      readers: [...readers],
      line,
    };
  });
}
