#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import {
  buildBaseline,
  listAlgorithmConnascence,
  listExecutionConnascence,
  listMeaningConnascence,
  listPositionConnascence,
  listValueConnascence,
  listRatchetFailures,
  rankFindings,
  summariseByWorkspace,
  summariseByKind,
  LOCALITY_NAME,
  STRENGTH_RANK,
  type Baseline,
  type BodySite,
  type Finding,
  type LiteralSite,
  type MutableStateSite,
  type RegexSite,
  type SignatureSite,
  type SourceFile,
  type UnionSite,
} from './connascence.core';

const REPOSITORY_ROOT = process.cwd();
const REPORT_PATH = join(REPOSITORY_ROOT, 'docs', 'standards', 'connascence.md');
const BASELINE_PATH = join(REPOSITORY_ROOT, 'docs', 'standards', 'connascence-baseline.json');
const SOURCE_PATH_PATTERN = /^(apps|infra)\/.*\.(ts|tsx)$/;
const TEST_PATH_PATTERN = /(^|\/)__test\/|[.](test|spec)[.]tsx?$/;
const DECLARATION_PATTERN = /[.]d[.]ts$/;
const MINIMUM_STRING_LENGTH = 3;
const TRIVIAL_NUMBERS = new Set(['0', '1', '2']);
const MINIMUM_REGEX_LENGTH = 6;
const MINIMUM_BODY_TOKENS = 40;
const DIGEST_LENGTH = 12;
const PUNCTUATION_ONLY = /^[^\p{L}\p{N}]+$/u;
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];
const JAVASCRIPT_EXTENSION_PATTERN = /[.]js$/;
const VOCABULARY_PATH = join(REPOSITORY_ROOT, 'docs', 'standards', 'connascence-vocabulary.json');

function readVocabulary(): ReadonlySet<string> {
  if (!existsSync(VOCABULARY_PATH)) return new Set();
  const parsed: unknown = JSON.parse(readFileSync(VOCABULARY_PATH, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return new Set();
  return new Set(Object.keys(parsed));
}

const EXTERNAL_VOCABULARY = readVocabulary();

function listSourceFiles(): readonly string[] {
  return execFileSync('git', ['ls-files'], { cwd: REPOSITORY_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((path) => SOURCE_PATH_PATTERN.test(path))
    .filter((path) => !TEST_PATH_PATTERN.test(path))
    .filter((path) => !DECLARATION_PATTERN.test(path));
}

interface Identity {
  readonly workspace: string;
  readonly container: string;
  readonly context: string | null;
}

const FILE_EXTENSION_MARKER = '.';

function identify(path: string): Identity {
  const segments = path.split('/');
  const sourceIndex = segments.indexOf('src');
  const rawContext = sourceIndex === -1 ? null : (segments[sourceIndex + 1] ?? null);
  return {
    workspace: `${segments[0] ?? ''}/${segments[1] ?? ''}`,
    container: segments[2] ?? 'root',
    context: rawContext !== null && rawContext.includes(FILE_EXTENSION_MARKER) ? null : rawContext,
  };
}

function resolveRelativeImport(fromPath: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(join(REPOSITORY_ROOT, fromPath)), specifier).replace(
    JAVASCRIPT_EXTENSION_PATTERN,
    '',
  );
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (existsSync(candidate)) return candidate.slice(REPOSITORY_ROOT.length + 1);
  }
  return null;
}

interface Extraction {
  readonly literals: LiteralSite[];
  readonly regexes: RegexSite[];
  readonly bodies: BodySite[];
  readonly signatures: SignatureSite[];
  readonly unions: UnionSite[];
  readonly states: MutableStateSite[];
  readonly imports: string[];
}

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function isModuleScope(declaration: ts.VariableDeclaration): boolean {
  const list = declaration.parent;
  const statement = list.parent;
  return statement !== undefined && ts.isSourceFile(statement.parent);
}

function isSkippableLiteralPosition(node: ts.Node): boolean {
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

function isTypeofComparison(parent: ts.Node): boolean {
  if (!ts.isBinaryExpression(parent)) return false;
  return ts.isTypeOfExpression(parent.left) || ts.isTypeOfExpression(parent.right);
}

function isNamedConstant(node: ts.Node): boolean {
  const parent = node.parent;
  if (parent === undefined || !ts.isVariableDeclaration(parent)) return false;
  if (parent.initializer !== node) return false;
  return isModuleScope(parent);
}

interface BodyDigest {
  readonly digest: string;
  readonly tokens: number;
}

function digestOfBody(source: ts.SourceFile, body: ts.Node): BodyDigest {
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

function countPositionalParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): number {
  const relevant = parameters.filter(
    (parameter) => !(ts.isIdentifier(parameter.name) && parameter.name.text === THIS_PARAMETER),
  );
  const only = relevant[0];
  if (relevant.length === 1 && only !== undefined && ts.isObjectBindingPattern(only.name)) return 0;
  return relevant.length;
}

function isExported(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return (modifiers ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function namedOwnerOf(node: ts.Node): string | null {
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

function collectMutableState(
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

function extract(path: string, text: string): Extraction {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result: Extraction = {
    literals: [],
    regexes: [],
    bodies: [],
    signatures: [],
    unions: [],
    states: [],
    imports: [],
  };
  const mutableNames = new Map<string, number>();

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const resolved = resolveRelativeImport(path, node.moduleSpecifier.text);
      if (resolved !== null) result.imports.push(resolved);
    }
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      !isSkippableLiteralPosition(node) &&
      node.text.length >= MINIMUM_STRING_LENGTH &&
      !PUNCTUATION_ONLY.test(node.text) &&
      !EXTERNAL_VOCABULARY.has(node.text)
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
    ts.forEachChild(node, visit);
  };
  visit(source);
  result.states.push(...collectMutableState(source, path, mutableNames));
  return result;
}

interface Measured {
  readonly findings: readonly Finding[];
  readonly index: ReadonlyMap<string, SourceFile>;
  readonly fileCount: number;
}

interface WorkspaceSites {
  literals: LiteralSite[];
  regexes: RegexSite[];
  bodies: BodySite[];
  signatures: SignatureSite[];
  unions: UnionSite[];
  states: MutableStateSite[];
  literalsByPath: Map<string, ReadonlySet<string>>;
}

function emptySites(): WorkspaceSites {
  return {
    literals: [],
    regexes: [],
    bodies: [],
    signatures: [],
    unions: [],
    states: [],
    literalsByPath: new Map(),
  };
}

function measure(): Measured {
  const paths = listSourceFiles();
  const index = new Map<string, SourceFile>();
  const perWorkspace = new Map<string, WorkspaceSites>();
  const importersOf = new Map<string, string[]>();

  for (const path of paths) {
    const extracted = extract(path, readFileSync(join(REPOSITORY_ROOT, path), 'utf8'));
    const identity = identify(path);
    index.set(path, { path, ...identity, imports: extracted.imports });
    const sites = perWorkspace.get(identity.workspace) ?? emptySites();
    sites.literals.push(...extracted.literals);
    sites.regexes.push(...extracted.regexes);
    sites.bodies.push(...extracted.bodies);
    sites.signatures.push(...extracted.signatures);
    sites.unions.push(...extracted.unions);
    sites.states.push(...extracted.states);
    sites.literalsByPath.set(path, new Set(extracted.literals.map((literal) => literal.value)));
    perWorkspace.set(identity.workspace, sites);
    for (const target of extracted.imports) {
      const bucket = importersOf.get(target) ?? [];
      bucket.push(path);
      importersOf.set(target, bucket);
    }
  }

  const findings = [...perWorkspace.values()].flatMap((sites) => [
    ...listMeaningConnascence(sites.literals, index),
    ...listAlgorithmConnascence(sites.regexes, sites.bodies, index),
    ...listPositionConnascence(sites.signatures, importersOf, index),
    ...listValueConnascence(sites.unions, sites.literalsByPath, index),
    ...listExecutionConnascence(sites.states, index),
  ]);
  return { findings: rankFindings(findings), index, fileCount: paths.length };
}

const GENERATED_BANNER =
  '<!-- Generated by scripts/standards/connascence.ts. Do not edit by hand. -->';
const WORST_FINDINGS_SHOWN = 30;
const SUBJECT_WIDTH = 70;

function renderReport(measured: Measured): string {
  const lines: string[] = [
    GENERATED_BANNER,
    '',
    '# Connascence',
    '',
    `Read from ${String(measured.fileCount)} source file(s) under \`apps/\` and \`infra/\`, tests excluded.`,
    '',
    '## By kind',
    '',
    '| Kind | Strength rank | Findings | Sites | Score |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const summary of summariseByKind(measured.findings)) {
    lines.push(
      `| ${summary.kind} | ${String(STRENGTH_RANK[summary.kind])} | ${String(summary.findings)} | ${String(summary.sites)} | ${String(summary.score)} |`,
    );
  }
  lines.push('', '## By workspace', '', '| Workspace | Score |', '| --- | --- |');
  const perWorkspace = [...summariseByWorkspace(measured.findings, measured.index)].sort(
    (left, right) => right[1] - left[1],
  );
  for (const [workspace, score] of perWorkspace) {
    lines.push(`| ${workspace} | ${String(score)} |`);
  }
  lines.push(
    '',
    `## Worst ${String(WORST_FINDINGS_SHOWN)}`,
    '',
    '| Score | Kind | Locality | Degree | Subject | First site |',
    '| --- | --- | --- | --- | --- | --- |',
  );
  for (const finding of measured.findings.slice(0, WORST_FINDINGS_SHOWN)) {
    const first = finding.occurrences[0];
    const subject = finding.subject.replaceAll('|', '\\|').slice(0, SUBJECT_WIDTH);
    lines.push(
      `| ${String(finding.score)} | ${finding.kind} | ${LOCALITY_NAME[finding.locality] ?? 'unknown'} | ${String(finding.degree)} | \`${subject}\` | \`${first?.path ?? ''}:${String(first?.line ?? 0)}\` |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function readBaseline(): Baseline {
  if (!existsSync(BASELINE_PATH)) return {};
  const parsed: unknown = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'number') counts[key] = value;
  }
  return counts;
}

function main(): void {
  const measured = measure();
  const current = buildBaseline(measured.findings, measured.index);

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ counts: current, findings: measured.findings }));
    return;
  }

  const rendered = renderReport(measured);

  if (process.argv.includes('--accept')) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
    writeFileSync(REPORT_PATH, rendered);
    console.log(`Baseline accepted: ${String(Object.keys(current).length)} counter(s).`);
    return;
  }

  writeFileSync(REPORT_PATH, rendered);
  const failures = listRatchetFailures(readBaseline(), current);

  if (process.argv.includes('--check')) {
    for (const failure of failures) {
      console.error(`  ${failure.key}: was ${String(failure.was)}, now ${String(failure.now)}.`);
    }
    if (failures.length > 0) {
      console.error('');
      console.error('  Connascence went up. Name the shared literal, take an object instead of');
      console.error('  positional parameters, or export the rule both sides copied.');
      console.error('  Deciding to accept it takes `--accept` in the same commit.');
      process.exitCode = 1;
      return;
    }
    console.log('No kind of connascence gained a finding.');
    return;
  }

  console.log(
    `Wrote docs/standards/connascence.md: ${String(measured.findings.length)} finding(s) over ${String(measured.fileCount)} file(s).`,
  );
  for (const failure of failures) {
    console.log(`  ${failure.key}: ${String(failure.was)} -> ${String(failure.now)}`);
  }
}

main();
