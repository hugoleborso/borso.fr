import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parseSync } from 'oxc-parser';
import {
  forEachChild,
  parseSource,
  readLineNumber,
  readNodeText,
  type ParsedSource,
  type SyntaxNode,
} from './syntax-tree';
import {
  inferApplication,
  inferLayer,
  inferProject,
  isTestFile,
} from '../../.claude/skills/blueprint/blueprint-utils';

export interface ExportedSymbol {
  readonly name: string;
  readonly line: number;
  readonly isFunction: boolean;
  readonly calls: readonly string[];
  readonly callSymbols: readonly CallSymbol[];
  readonly dependsOnExternal: readonly string[];
  readonly tables: readonly string[];
  readonly apiCalls: readonly ApiCall[];
  readonly blueprints: readonly string[];
  readonly followsBlueprints: readonly string[];
  readonly source: string;
  readonly lineCount: number;
  readonly complexity: number;
  readonly lintExceptions: number;
}

export interface CallSymbol {
  readonly name: string;
  readonly file: string | null;
  readonly packageName: string | null;
}

export interface ImportEdge {
  readonly targetFile: string | null;
  readonly packageName: string | null;
  readonly namedBindings: readonly string[];
  readonly isTypeOnly: boolean;
}

export interface RouteEntry {
  readonly method: string;
  readonly path: string;
  readonly line: number;
  readonly calls: readonly CallSymbol[];
  readonly routerVariable: string;
}

export interface ArchitectureFile {
  readonly path: string;
  readonly digest: string;
  readonly application: string;
  readonly container: string;
  readonly layer: string;
  readonly context: string;
  readonly feature: string | null;
  readonly lineCount: number;
  readonly complexity: number;
  readonly lintExceptions: number;
  readonly blueprints: readonly string[];
  readonly followsBlueprints: readonly string[];
  readonly dependsOnExternal: readonly string[];
  readonly exports: readonly ExportedSymbol[];
  readonly imports: readonly ImportEdge[];
  readonly routes: readonly RouteEntry[];
  readonly tables: readonly string[];
  readonly mounts: readonly RouteMount[];
  readonly apiCalls: readonly ApiCall[];
  readonly urlStrings: readonly string[];
  readonly screenRoutes: readonly ScreenRoute[];
  readonly gestures: readonly HookGesture[];
}

export interface ScreenRoute {
  readonly path: string;
  readonly component: string;
  readonly componentFile: string | null;
}

export interface GestureBinding {
  readonly event: string;
  readonly line: number;
}

export interface HookGesture extends GestureBinding {
  readonly hook: string;
}

export interface RouteMount {
  readonly basePath: string;
  readonly routerFactory: string;
  readonly targetFile: string | null;
}

export interface NodeMetrics {
  readonly lines: number;
  readonly complexity: number;
  readonly disables: number;
  readonly files: number;
}

export function symbolMetrics(symbol: ExportedSymbol): NodeMetrics {
  return {
    lines: symbol.lineCount,
    complexity: symbol.complexity,
    disables: symbol.lintExceptions,
    files: 1,
  };
}

export function aggregateMetrics(files: readonly ArchitectureFile[]): NodeMetrics {
  return {
    lines: files.reduce((total, file) => total + file.lineCount, 0),
    complexity: files.reduce((total, file) => total + file.complexity, 0),
    disables: files.reduce((total, file) => total + file.lintExceptions, 0),
    files: files.length,
  };
}

type NodeOf<Kind extends SyntaxNode['type']> = SyntaxNode extends infer Candidate
  ? Candidate extends { readonly type: infer CandidateKind }
    ? Kind extends CandidateKind
      ? Candidate
      : never
    : never
  : never;

function isKind<Kind extends SyntaxNode['type']>(
  node: SyntaxNode | null | undefined,
  kind: Kind,
): node is NodeOf<Kind> {
  return node?.type === kind;
}

function readIdentifierName(node: SyntaxNode | null | undefined): string | null {
  return isKind(node, 'Identifier') ? node.name : null;
}

function readStringLiteral(node: SyntaxNode | null | undefined): string | null {
  return isKind(node, 'Literal') && typeof node.value === 'string' ? node.value : null;
}

function readBoundNames(pattern: SyntaxNode): string[] {
  const own = readIdentifierName(pattern);
  if (own !== null) return [own];
  if (!isKind(pattern, 'ObjectPattern')) return [];
  return pattern.properties.flatMap((property) => {
    const target = property.type === 'RestElement' ? property.argument : property.value;
    const bound = isKind(target, 'AssignmentPattern') ? target.left : target;
    const name = readIdentifierName(bound);
    return name === null ? [] : [name];
  });
}

function buildLocalAliases(
  source: ParsedSource,
  importLookup: ReadonlyMap<string, CallSymbol>,
): Map<string, CallSymbol> {
  const aliases = new Map<string, CallSymbol>();
  const visit = (node: SyntaxNode): void => {
    if (isKind(node, 'VariableDeclarator') && node.init !== null) {
      let source: CallSymbol | undefined;
      for (const identifier of collectReferencedIdentifiers(node.init)) {
        source = importLookup.get(identifier);
        if (source !== undefined) break;
      }
      if (source !== undefined) {
        for (const name of readBoundNames(node.id)) aliases.set(name, source);
      }
    }
    forEachChild(node, visit);
  };
  visit(source.program);
  return aliases;
}

function findRouterVariable(source: ParsedSource, node: SyntaxNode): string {
  let current: SyntaxNode | undefined = node;
  while (current !== undefined) {
    if (isKind(current, 'VariableDeclarator')) {
      const name = readIdentifierName(current.id);
      if (name !== null) return name;
    }
    if (isKind(current, 'FunctionDeclaration') && current.id !== null) {
      return current.id.name;
    }
    current = source.parentOf.get(current);
  }
  return '';
}

export interface ApiCall {
  readonly method: string;
  readonly path: string;
  readonly line: number;
}

const SOURCE_EXTENSIONS = ['.ts', '.tsx'] as const;
const API_CLIENT_BINDING = 'api';
const DIGEST_LENGTH = 12;
const INDEX_BASENAMES = ['index.ts', 'index.tsx'] as const;

const HONO_ROUTE_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'all']);
const HONO_MOUNT_METHOD = 'route';

const BLUEPRINT_TAG = /@Blueprint\s+([\w-]+)/g;
const FOLLOWS_BLUEPRINT_TAG = /@FollowsBlueprint\s+(.+)/g;
const DEPENDS_ON_EXTERNAL_TAG = /@DependsOnExternal\s+([\w-]+)/g;
const FEATURE_TAG = /@Feature\s+([\w-]+)/;

function matchAll(pattern: RegExp, text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(new RegExp(pattern.source, pattern.flags))) {
    const captured = match[1];
    if (captured !== undefined) {
      found.push(...captured.trim().split(/\s+/));
    }
  }
  return found;
}

function readProperty(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
}

function readLiteralValue(node: SyntaxNode): unknown {
  if (isKind(node, 'Literal')) return node.value;
  if (isKind(node, 'ArrayExpression')) {
    return node.elements.map((element) => (element === null ? null : readLiteralValue(element)));
  }
  if (!isKind(node, 'ObjectExpression')) return undefined;
  const entries: [string, unknown][] = [];
  for (const property of node.properties) {
    if (property.type !== 'Property') continue;
    const key = readIdentifierName(property.key) ?? readStringLiteral(property.key);
    if (key !== null) entries.push([key, readLiteralValue(property.value)]);
  }
  return Object.fromEntries(entries);
}

function readConfigurationFile(configPath: string): unknown {
  let text: string;
  try {
    text = readFileSync(configPath, 'utf8');
  } catch {
    return undefined;
  }
  const { program, errors } = parseSync(`${configPath}.ts`, `(${text})`);
  const [statement] = program.body;
  if (errors.length > 0 || !isKind(statement, 'ExpressionStatement')) return undefined;
  const expression = isKind(statement.expression, 'ParenthesizedExpression')
    ? statement.expression.expression
    : statement.expression;
  return readLiteralValue(expression);
}

const aliasesByApplicationRoot = new Map<string, readonly (readonly [string, string])[]>();

function readAliasPrefixes(applicationRoot: string): readonly (readonly [string, string])[] {
  const cached = aliasesByApplicationRoot.get(applicationRoot);
  if (cached !== undefined) return cached;
  const configPath = join(applicationRoot, 'tsconfig.json');
  const configuration = readConfigurationFile(configPath);
  const prefixes: [string, string][] = [];
  const paths: unknown = readProperty(readProperty(configuration, 'compilerOptions'), 'paths');
  if (typeof paths === 'object' && paths !== null) {
    for (const [pattern, targets] of Object.entries(paths)) {
      const first = Array.isArray(targets) ? targets[0] : undefined;
      if (typeof first !== 'string') continue;
      if (!pattern.endsWith('/*') || !first.endsWith('/*')) continue;
      prefixes.push([
        pattern.slice(0, -1),
        join(applicationRoot, first.slice(0, -2).replace(/^\.\//, '')),
      ]);
    }
  }
  const resolved = prefixes.sort((left, right) => right[0].length - left[0].length);
  aliasesByApplicationRoot.set(applicationRoot, resolved);
  return resolved;
}

function resolveSpecifier(
  specifier: string,
  containingFile: string,
  repositoryRoot: string,
  applicationRoot: string,
): { targetFile: string | null; packageName: string | null } {
  const aliasPrefixes = readAliasPrefixes(applicationRoot);

  let absoluteBase: string | null = null;
  if (specifier.startsWith('.')) {
    absoluteBase = resolve(dirname(containingFile), specifier);
  } else {
    for (const [prefix, root] of aliasPrefixes) {
      if (specifier.startsWith(prefix)) {
        absoluteBase = join(root, specifier.slice(prefix.length));
        break;
      }
    }
  }

  if (absoluteBase === null) {
    const segments = specifier.split('/');
    const packageName = specifier.startsWith('@')
      ? segments.slice(0, 2).join('/')
      : (segments[0] ?? specifier);
    return { targetFile: null, packageName };
  }

  const candidates = [
    ...SOURCE_EXTENSIONS.map((extension) => `${absoluteBase}${extension}`),
    ...INDEX_BASENAMES.map((basename) => join(absoluteBase, basename)),
    absoluteBase,
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return { targetFile: relative(repositoryRoot, candidate), packageName: null };
    } catch {
      continue;
    }
  }
  return { targetFile: null, packageName: null };
}

function collectReferencedIdentifiers(node: SyntaxNode): Set<string> {
  const referenced = new Set<string>();
  const visit = (current: SyntaxNode): void => {
    if (isKind(current, 'Identifier') || isKind(current, 'JSXIdentifier')) {
      referenced.add(current.name);
    }
    forEachChild(current, visit);
  };
  visit(node);
  return referenced;
}

function buildImportLookup(imports: readonly ImportEdge[]): Map<string, CallSymbol> {
  const lookup = new Map<string, CallSymbol>();
  for (const edge of imports) {
    if (edge.isTypeOnly) continue;
    for (const binding of edge.namedBindings) {
      lookup.set(binding, {
        name: binding,
        file: edge.targetFile,
        packageName: edge.packageName,
      });
    }
  }
  return lookup;
}

function readImports(
  source: ParsedSource,
  containingFile: string,
  repositoryRoot: string,
  applicationRoot: string,
): ImportEdge[] {
  const edges: ImportEdge[] = [];
  for (const statement of source.program.body) {
    if (!isKind(statement, 'ImportDeclaration')) continue;
    const resolved = resolveSpecifier(
      statement.source.value,
      containingFile,
      repositoryRoot,
      applicationRoot,
    );
    const namedBindings: string[] = [];
    let isTypeOnly = statement.importKind === 'type';
    const named = statement.specifiers.filter((specifier) => specifier.type === 'ImportSpecifier');
    for (const specifier of statement.specifiers) {
      if (specifier.type === 'ImportSpecifier' && specifier.importKind === 'type') continue;
      namedBindings.push(specifier.local.name);
    }
    if (named.length > 0 && named.every((specifier) => specifier.importKind === 'type')) {
      isTypeOnly = true;
    }
    edges.push({
      targetFile: resolved.targetFile,
      packageName: resolved.packageName,
      namedBindings,
      isTypeOnly,
    });
  }
  return edges;
}

const TABLE_IDENTIFIER_PATTERN = /^[a-z][A-Za-z]*Table$/;

const MAXIMUM_SOURCE_LINES = 80;

const NESTING_KINDS: ReadonlySet<string> = new Set([
  'IfStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'CatchClause',
  'SwitchStatement',
  'ConditionalExpression',
]);

const LOGICAL_OPERATORS: ReadonlySet<string> = new Set(['&&', '||', '??']);

function isMethod(source: ParsedSource, node: SyntaxNode): boolean {
  if (isKind(node, 'MethodDefinition')) return node.kind === 'method';
  return (
    isKind(node, 'Property') &&
    node.method &&
    source.parentOf.get(node)?.type === 'ObjectExpression'
  );
}

function isMethodBody(source: ParsedSource, node: SyntaxNode): boolean {
  const parent = source.parentOf.get(node);
  if (!isKind(node, 'FunctionExpression') || parent === undefined) return false;
  return (
    isKind(parent, 'MethodDefinition') ||
    isKind(parent, 'TSAbstractMethodDefinition') ||
    (isKind(parent, 'Property') && (parent.method || parent.kind !== 'init'))
  );
}

function cognitiveComplexity(source: ParsedSource, root: SyntaxNode): number {
  let total = 0;

  const isNesting = (node: SyntaxNode): boolean => NESTING_KINDS.has(node.type);

  const isNestingOrFunction = (node: SyntaxNode): boolean =>
    isNesting(node) ||
    isKind(node, 'FunctionDeclaration') ||
    (isKind(node, 'FunctionExpression') && !isMethodBody(source, node)) ||
    isKind(node, 'ArrowFunctionExpression') ||
    isMethod(source, node);

  const visit = (node: SyntaxNode, nesting: number): void => {
    let hasScored = false;
    const parent = source.parentOf.get(node);

    if (isKind(node, 'IfStatement')) {
      const isElseIf = isKind(parent, 'IfStatement') && parent.alternate === node;
      total += isElseIf ? 1 : 1 + nesting;
      hasScored = true;
      if (node.alternate !== null && !isKind(node.alternate, 'IfStatement')) {
        total += 1;
      }
    } else if (isNesting(node)) {
      total += 1 + nesting;
      hasScored = true;
    } else if (isKind(node, 'LogicalExpression') && LOGICAL_OPERATORS.has(node.operator)) {
      const isParentSameOperator =
        isKind(parent, 'LogicalExpression') && parent.operator === node.operator;
      if (!isParentSameOperator) total += 1;
    }

    const nextNesting = isNestingOrFunction(node) ? nesting + 1 : nesting;
    forEachChild(node, (child) => {
      visit(child, hasScored || isNestingOrFunction(node) ? nextNesting : nesting);
    });
  };

  forEachChild(root, (child) => {
    visit(child, 0);
  });
  return total;
}

const LINT_DISABLE_PATTERN = /eslint-disable(-next-line|-line)?/g;

function readFullText(source: ParsedSource, node: SyntaxNode, fullStart: number): string {
  return source.text.slice(fullStart, node.end);
}

function captureSource(full: string): string {
  const trimmed = full.replace(/^\n+/, '');
  const lines = trimmed.split('\n');
  if (lines.length <= MAXIMUM_SOURCE_LINES) return trimmed.trimEnd();
  return [
    ...lines.slice(0, MAXIMUM_SOURCE_LINES),
    `// … ${lines.length - MAXIMUM_SOURCE_LINES} more lines`,
  ].join('\n');
}

function dedupeApiCalls(calls: readonly ApiCall[]): ApiCall[] {
  return [...new Map(calls.map((call) => [`${call.method} ${call.path}`, call])).values()];
}

function unwrapExport(statement: SyntaxNode): SyntaxNode {
  if (isKind(statement, 'ExportNamedDeclaration') && statement.declaration !== null) {
    return statement.declaration;
  }
  if (isKind(statement, 'ExportDefaultDeclaration')) return statement.declaration;
  return statement;
}

function readLocalApiCalls(
  source: ParsedSource,
  clientIdentifier: string | null,
): Map<string, ApiCall[]> {
  if (clientIdentifier === null) return new Map();
  const own = new Map<string, ApiCall[]>();
  const references = new Map<string, Set<string>>();
  for (const statement of source.program.body) {
    const declaration = unwrapExport(statement);
    const named: (readonly [string, SyntaxNode])[] =
      isKind(declaration, 'FunctionDeclaration') && declaration.id !== null
        ? [[declaration.id.name, declaration]]
        : isKind(declaration, 'VariableDeclaration')
          ? declaration.declarations.flatMap((declarator) => {
              const name = readIdentifierName(declarator.id);
              return name !== null && declarator.init !== null
                ? [[name, declarator.init] as const]
                : [];
            })
          : [];
    for (const [name, node] of named) {
      own.set(name, readApiCallsIn(source, node, clientIdentifier));
      references.set(name, collectReferencedIdentifiers(node));
    }
  }

  const resolved = new Map(own);
  for (let pass = 0; pass < own.size; pass += 1) {
    let hasGrown = false;
    for (const [name, referenced] of references) {
      const inherited = [...referenced].flatMap((each) =>
        each === name ? [] : (resolved.get(each) ?? []),
      );
      const merged = dedupeApiCalls([...(resolved.get(name) ?? []), ...inherited]);
      if (merged.length === (resolved.get(name) ?? []).length) continue;
      resolved.set(name, merged);
      hasGrown = true;
    }
    if (!hasGrown) break;
  }
  return resolved;
}

function readExportedSymbols(
  source: ParsedSource,
  importLookup: Map<string, CallSymbol>,
  fileExternals: readonly string[],
  clientIdentifier: string | null,
): ExportedSymbol[] {
  const symbols: ExportedSymbol[] = [];
  const localCalls = readLocalApiCalls(source, clientIdentifier);

  const record = (
    name: string,
    statement: SyntaxNode,
    fullStart: number,
    body: SyntaxNode,
    isFunction: boolean,
  ): void => {
    const referenced = collectReferencedIdentifiers(statement);
    const callSymbols: CallSymbol[] = [];
    const calledFiles = new Set<string>();
    const tables = new Set<string>();
    for (const identifier of referenced) {
      const resolved = importLookup.get(identifier);
      if (resolved === undefined) continue;
      callSymbols.push(resolved);
      if (resolved.file !== null) calledFiles.add(resolved.file);
      const isSchemaModule =
        resolved.file !== null &&
        (resolved.file.endsWith('.schema.ts') || resolved.file.endsWith('/schema.ts'));
      if (isSchemaModule && TABLE_IDENTIFIER_PATTERN.test(identifier)) tables.add(identifier);
    }
    const fullText = readFullText(source, statement, fullStart);
    const leadingText = source.text.slice(fullStart, statement.start);
    const ownExternals = matchAll(DEPENDS_ON_EXTERNAL_TAG, leadingText);
    symbols.push({
      name,
      line: readLineNumber(source, statement.start),
      isFunction,
      calls: [...calledFiles],
      callSymbols,
      dependsOnExternal: ownExternals.length > 0 ? ownExternals : [...fileExternals],
      tables: [...tables],
      apiCalls: dedupeApiCalls([
        ...readApiCallsIn(source, statement, clientIdentifier),
        ...[...referenced].flatMap((identifier) => localCalls.get(identifier) ?? []),
      ]),
      blueprints: matchAll(BLUEPRINT_TAG, leadingText),
      followsBlueprints: matchAll(FOLLOWS_BLUEPRINT_TAG, leadingText),
      source: captureSource(fullText),
      lineCount: fullText.replace(/^\n+/, '').split('\n').length,
      complexity: cognitiveComplexity(source, body),
      lintExceptions: (fullText.match(LINT_DISABLE_PATTERN) ?? []).length,
    });
  };

  source.program.body.forEach((statement, index) => {
    if (
      !isKind(statement, 'ExportNamedDeclaration') &&
      !isKind(statement, 'ExportDefaultDeclaration')
    ) {
      return;
    }
    const fullStart = index === 0 ? 0 : (source.program.body[index - 1]?.end ?? 0);
    const declaration = unwrapExport(statement);
    if (isKind(declaration, 'FunctionDeclaration') && declaration.id !== null) {
      record(declaration.id.name, statement, fullStart, declaration, true);
      return;
    }
    if (isKind(declaration, 'ClassDeclaration') && declaration.id !== null) {
      record(declaration.id.name, statement, fullStart, declaration, false);
      return;
    }
    if (isKind(declaration, 'VariableDeclaration')) {
      for (const declarator of declaration.declarations) {
        const name = readIdentifierName(declarator.id);
        if (name === null) continue;
        const isFunction =
          isKind(declarator.init, 'ArrowFunctionExpression') ||
          isKind(declarator.init, 'FunctionExpression');
        record(name, statement, fullStart, declaration, isFunction);
      }
    }
  });
  return symbols;
}

function readRoutesAndMounts(
  source: ParsedSource,
  importLookup: Map<string, CallSymbol>,
  localAliases: ReadonlyMap<string, CallSymbol>,
): { routes: RouteEntry[]; mounts: RouteMount[] } {
  const routes: RouteEntry[] = [];
  const mounts: RouteMount[] = [];

  const visit = (node: SyntaxNode): void => {
    if (
      isKind(node, 'CallExpression') &&
      isKind(node.callee, 'MemberExpression') &&
      !node.callee.computed &&
      isKind(node.callee.property, 'Identifier')
    ) {
      const methodName = node.callee.property.name;
      const firstArgument = node.arguments[0];
      const firstPath = readStringLiteral(firstArgument);
      if (firstPath !== null) {
        if (HONO_ROUTE_METHODS.has(methodName)) {
          const calls: CallSymbol[] = [];
          const seen = new Set<string>();
          for (const argument of node.arguments.slice(1)) {
            for (const identifier of collectReferencedIdentifiers(argument)) {
              const resolved = importLookup.get(identifier);
              if (resolved === undefined || seen.has(identifier)) continue;
              seen.add(identifier);
              calls.push(resolved);
            }
          }
          routes.push({
            method: methodName.toUpperCase(),
            path: firstPath,
            line: readLineNumber(source, node.start),
            calls,
            routerVariable: findRouterVariable(source, node),
          });
        }
        if (methodName === HONO_MOUNT_METHOD) {
          const mountArgument = node.arguments[1];
          let routerFactory = '';
          if (mountArgument !== undefined) {
            const identifiers = [...collectReferencedIdentifiers(mountArgument)];
            routerFactory = identifiers[0] ?? '';
          }
          const resolved = importLookup.get(routerFactory) ?? localAliases.get(routerFactory);
          mounts.push({
            basePath: firstPath,
            routerFactory,
            targetFile: resolved?.file ?? null,
          });
        }
      }
    }
    forEachChild(node, visit);
  };
  visit(source.program);
  return { routes, mounts };
}

function readApiCallsIn(
  source: ParsedSource,
  root: SyntaxNode,
  clientIdentifier: string | null,
): ApiCall[] {
  if (clientIdentifier === null) return [];
  const calls: ApiCall[] = [];

  const readChain = (node: SyntaxNode): string[] | null => {
    const segments: string[] = [];
    let current: SyntaxNode = node;
    for (;;) {
      if (isKind(current, 'Identifier')) {
        return current.name === clientIdentifier ? segments.reverse() : null;
      }
      if (isKind(current, 'MemberExpression') && !current.computed) {
        const name = readIdentifierName(current.property);
        if (name === null) return null;
        segments.push(name);
        current = current.object;
        continue;
      }
      if (isKind(current, 'MemberExpression')) {
        const key = readStringLiteral(current.property);
        if (key === null) return null;
        segments.push(key);
        current = current.object;
        continue;
      }
      return null;
    }
  };

  const visit = (node: SyntaxNode): void => {
    if (isKind(node, 'MemberExpression') && !node.computed) {
      const name = readIdentifierName(node.property);
      if (name?.startsWith('$') === true) {
        const segments = readChain(node.object);
        if (segments !== null) {
          calls.push({
            method: name.slice(1).toUpperCase(),
            path: `/${segments.join('/')}`,
            line: readLineNumber(source, node.start),
          });
        }
      }
    }
    forEachChild(node, visit);
  };
  visit(root);
  return calls;
}

function readApiCalls(source: ParsedSource, clientIdentifier: string | null): ApiCall[] {
  return readApiCallsIn(source, source.program, clientIdentifier);
}

const API_PATH_STRING = /['"`](\/api\/[A-Za-z0-9\-_/:]*)['"`]/g;

export function readApiPathStrings(text: string): string[] {
  return [...new Set(matchAll(API_PATH_STRING, text))];
}

function readTables(imports: readonly ImportEdge[]): string[] {
  const tables = new Set<string>();
  for (const edge of imports) {
    if (edge.targetFile === null) continue;
    if (!edge.targetFile.endsWith('.schema.ts') && !edge.targetFile.endsWith('/schema.ts')) {
      continue;
    }
    for (const binding of edge.namedBindings) {
      if (/^[a-z][A-Za-z]*Table$/.test(binding)) {
        tables.add(binding);
      }
    }
  }
  return [...tables];
}

function inferContext(filePath: string, container: string): string {
  const apiContext = /\/api\/src\/([^/]+)\//.exec(filePath)?.[1];
  if (container === 'api' && apiContext !== undefined) {
    return apiContext;
  }
  if (container === 'api') return 'root';
  if (container === 'domain') return 'domain';
  if (container === 'cdk') return 'cdk';
  const routeContext = /\/site\/src\/routes\/([^/]+)\//.exec(filePath)?.[1];
  if (routeContext !== undefined) return routeContext;
  const componentContext = /\/site\/src\/components\/([^/]+)\//.exec(filePath)?.[1];
  if (componentContext !== undefined) return componentContext;
  if (filePath.includes('/site/src/lib/queries/')) return 'queries';
  const siteContext = /\/site\/src\/([^/]+)\//.exec(filePath)?.[1];
  if (siteContext !== undefined) return siteContext;
  return 'root';
}

const MODULE_HEADER_END = '\nimport ';

function readModuleHeaderText(text: string): string {
  const firstImportIndex = text.indexOf(MODULE_HEADER_END);
  return firstImportIndex === -1 ? text : text.slice(0, firstImportIndex);
}

export function buildArchitectureFile(
  absolutePath: string,
  repositoryRoot: string,
  applicationRoot: string,
): ArchitectureFile {
  return buildArchitectureFileFromText(
    absolutePath,
    readFileSync(absolutePath, 'utf8'),
    repositoryRoot,
    applicationRoot,
  );
}

export function buildArchitectureFileFromText(
  absolutePath: string,
  text: string,
  repositoryRoot: string,
  applicationRoot: string,
): ArchitectureFile {
  const relativePath = relative(repositoryRoot, absolutePath);
  const sourceFile = parseSource(absolutePath, text);

  const headerExternals = matchAll(DEPENDS_ON_EXTERNAL_TAG, readModuleHeaderText(text));

  const imports = readImports(sourceFile, absolutePath, repositoryRoot, applicationRoot);
  const importLookup = buildImportLookup(imports);
  const container = inferProject(relativePath);
  const featureMatch = FEATURE_TAG.exec(text);
  const localAliases = buildLocalAliases(sourceFile, importLookup);
  const { routes, mounts } = readRoutesAndMounts(sourceFile, importLookup, localAliases);
  const clientBinding = imports
    .filter((edge) => edge.targetFile !== null)
    .flatMap((edge) => edge.namedBindings)
    .find((binding) => binding === API_CLIENT_BINDING);

  return {
    path: relativePath,
    digest: createHash('sha1').update(text).digest('hex').slice(0, DIGEST_LENGTH),
    application: inferApplication(relativePath),
    container,
    layer: inferLayer(relativePath),
    context: inferContext(relativePath, container),
    feature: featureMatch?.[1] ?? null,
    lineCount: text.split('\n').length,
    complexity: cognitiveComplexity(sourceFile, sourceFile.program),
    lintExceptions: (text.match(LINT_DISABLE_PATTERN) ?? []).length,
    blueprints: matchAll(BLUEPRINT_TAG, text),
    followsBlueprints: matchAll(FOLLOWS_BLUEPRINT_TAG, text),
    dependsOnExternal: matchAll(DEPENDS_ON_EXTERNAL_TAG, text),
    exports: readExportedSymbols(sourceFile, importLookup, headerExternals, clientBinding ?? null),
    imports,
    routes,
    tables: readTables(imports),
    mounts,
    apiCalls: readApiCalls(sourceFile, clientBinding ?? null),
    urlStrings: readApiPathStrings(text),
    screenRoutes: readScreenRoutes(sourceFile, importLookup),
    gestures: readHookGestures(sourceFile, imports),
  };
}

function readJsxName(source: ParsedSource, node: SyntaxNode): string {
  return readNodeText(source, node);
}

function readSelfClosingName(source: ParsedSource, node: SyntaxNode): string | null {
  if (!isKind(node, 'JSXElement') || !node.openingElement.selfClosing) return null;
  return readJsxName(source, node.openingElement.name);
}

export function readScreenRoutes(
  source: ParsedSource,
  importLookup: ReadonlyMap<string, CallSymbol>,
): ScreenRoute[] {
  const found: ScreenRoute[] = [];
  const visit = (node: SyntaxNode): void => {
    if (isKind(node, 'JSXElement') && readSelfClosingName(source, node) === 'Route') {
      let path: string | null = null;
      let component: string | null = null;
      for (const attribute of node.openingElement.attributes) {
        if (!isKind(attribute, 'JSXAttribute')) continue;
        const name = readJsxName(source, attribute.name);
        const value = attribute.value;
        const literal = readStringLiteral(value);
        if (name === 'path' && literal !== null) {
          path = literal;
        }
        if (name === 'element' && isKind(value, 'JSXExpressionContainer')) {
          const expression = value.expression;
          const tag = readSelfClosingName(source, expression);
          if (tag !== null) component = tag;
        }
      }
      if (path !== null && component !== null) {
        found.push({
          path,
          component,
          componentFile: importLookup.get(component)?.file ?? null,
        });
      }
    }
    forEachChild(node, visit);
  };
  visit(source.program);
  return found;
}

export function readGestures(
  source: ParsedSource,
  identifiers: ReadonlySet<string>,
): GestureBinding[] {
  const found = new Map<string, GestureBinding>();
  const visit = (node: SyntaxNode): void => {
    if (isKind(node, 'JSXAttribute')) {
      const name = readJsxName(source, node.name);
      const value = node.value;
      if (/^on[A-Z]/.test(name) && isKind(value, 'JSXExpressionContainer')) {
        const referenced = collectReferencedIdentifiers(value);
        if ([...identifiers].some((each) => referenced.has(each)) && !found.has(name)) {
          found.set(name, {
            event: name,
            line: readLineNumber(source, node.start),
          });
        }
      }
    }
    forEachChild(node, visit);
  };
  visit(source.program);
  return [...found.values()].sort((left, right) => left.event.localeCompare(right.event));
}

interface LocalDeclaration {
  readonly names: string[];
  readonly referenced: ReadonlySet<string>;
}

function addLocalsDerivedFrom(names: Set<string>, declarations: readonly LocalDeclaration[]): void {
  let hasGrown = true;
  while (hasGrown) {
    hasGrown = false;
    for (const declaration of declarations) {
      if (![...names].some((each) => declaration.referenced.has(each))) continue;
      for (const name of declaration.names) {
        if (names.has(name)) continue;
        names.add(name);
        hasGrown = true;
      }
    }
  }
}

export function readHookGestures(
  sourceFile: ParsedSource,
  imports: readonly ImportEdge[],
): HookGesture[] {
  const hookNames = new Set(
    imports
      .filter((edge) => edge.targetFile?.endsWith('.queries.ts') === true && !edge.isTypeOnly)
      .flatMap((edge) => edge.namedBindings)
      .filter((binding) => binding.startsWith('use')),
  );
  if (hookNames.size === 0) return [];

  const localsByHook = new Map<string, Set<string>>(
    [...hookNames].map((hook) => [hook, new Set([hook])]),
  );
  const declarations: LocalDeclaration[] = [];
  const collectDeclarations = (node: SyntaxNode): void => {
    if (isKind(node, 'VariableDeclarator') && node.init !== null) {
      const bound = readBoundNames(node.id);
      if (bound.length > 0) {
        declarations.push({
          names: bound,
          referenced: collectReferencedIdentifiers(node.init),
        });
      }
    }
    forEachChild(node, collectDeclarations);
  };
  collectDeclarations(sourceFile.program);

  for (const names of localsByHook.values()) addLocalsDerivedFrom(names, declarations);

  return [...localsByHook.entries()].flatMap(([hook, names]) =>
    readGestures(sourceFile, names).map((gesture) => ({ ...gesture, hook })),
  );
}

export { isTestFile };
