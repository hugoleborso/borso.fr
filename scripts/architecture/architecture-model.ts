import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
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

function buildLocalAliases(
  sourceFile: ts.SourceFile,
  importLookup: ReadonlyMap<string, CallSymbol>,
): Map<string, CallSymbol> {
  const aliases = new Map<string, CallSymbol>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      let source: CallSymbol | undefined;
      for (const identifier of collectReferencedIdentifiers(node.initializer)) {
        source = importLookup.get(identifier);
        if (source !== undefined) break;
      }
      if (source !== undefined) {
        if (ts.isIdentifier(node.name)) {
          aliases.set(node.name.text, source);
        } else if (ts.isObjectBindingPattern(node.name)) {
          for (const element of node.name.elements) {
            if (ts.isIdentifier(element.name)) aliases.set(element.name.text, source);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return aliases;
}

function findRouterVariable(node: ts.Node): string {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      return current.name.text;
    }
    if (ts.isFunctionDeclaration(current) && current.name !== undefined) {
      return current.name.text;
    }
    current = current.parent;
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

const aliasesByApplicationRoot = new Map<string, readonly (readonly [string, string])[]>();

function readAliasPrefixes(applicationRoot: string): readonly (readonly [string, string])[] {
  const cached = aliasesByApplicationRoot.get(applicationRoot);
  if (cached !== undefined) return cached;
  const configPath = join(applicationRoot, 'tsconfig.json');
  const parsed = ts.readConfigFile(configPath, (path) => {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      return undefined;
    }
  });
  const prefixes: [string, string][] = [];
  const paths: unknown = parsed.config?.compilerOptions?.paths;
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

function collectReferencedIdentifiers(node: ts.Node): Set<string> {
  const referenced = new Set<string>();
  const visit = (current: ts.Node): void => {
    if (ts.isIdentifier(current)) {
      referenced.add(current.text);
    }
    ts.forEachChild(current, visit);
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
  sourceFile: ts.SourceFile,
  containingFile: string,
  repositoryRoot: string,
  applicationRoot: string,
): ImportEdge[] {
  const edges: ImportEdge[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const resolved = resolveSpecifier(
      statement.moduleSpecifier.text,
      containingFile,
      repositoryRoot,
      applicationRoot,
    );
    const clause = statement.importClause;
    const namedBindings: string[] = [];
    let isTypeOnly = clause?.isTypeOnly ?? false;
    if (clause?.name !== undefined) {
      namedBindings.push(clause.name.text);
    }
    const bindings = clause?.namedBindings;
    if (bindings !== undefined && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (element.isTypeOnly) continue;
        namedBindings.push(element.name.text);
      }
      if (bindings.elements.length > 0 && bindings.elements.every((each) => each.isTypeOnly)) {
        isTypeOnly = true;
      }
    }
    if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
      namedBindings.push(bindings.name.text);
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

function cognitiveComplexity(root: ts.Node): number {
  let total = 0;

  const isNesting = (node: ts.Node): boolean =>
    ts.isIfStatement(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isCatchClause(node) ||
    ts.isSwitchStatement(node) ||
    ts.isConditionalExpression(node);

  const isNestingOrFunction = (node: ts.Node): boolean =>
    isNesting(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node);

  const visit = (node: ts.Node, nesting: number): void => {
    let hasScored = false;

    if (ts.isIfStatement(node)) {
      const isElseIf =
        node.parent !== undefined &&
        ts.isIfStatement(node.parent) &&
        node.parent.elseStatement === node;
      total += isElseIf ? 1 : 1 + nesting;
      hasScored = true;
      if (node.elseStatement !== undefined && !ts.isIfStatement(node.elseStatement)) {
        total += 1;
      }
    } else if (isNesting(node)) {
      total += 1 + nesting;
      hasScored = true;
    } else if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind;
      const isLogical =
        operator === ts.SyntaxKind.AmpersandAmpersandToken ||
        operator === ts.SyntaxKind.BarBarToken ||
        operator === ts.SyntaxKind.QuestionQuestionToken;
      const parentIsSameOperator =
        node.parent !== undefined &&
        ts.isBinaryExpression(node.parent) &&
        node.parent.operatorToken.kind === operator;
      if (isLogical && !parentIsSameOperator) total += 1;
    }

    const nextNesting = isNestingOrFunction(node) ? nesting + 1 : nesting;
    ts.forEachChild(node, (child) => {
      visit(child, hasScored || isNestingOrFunction(node) ? nextNesting : nesting);
    });
  };

  ts.forEachChild(root, (child) => {
    visit(child, 0);
  });
  return total;
}

const LINT_DISABLE_PATTERN = /eslint-disable(-next-line|-line)?/g;

function captureSource(node: ts.Node, sourceFile: ts.SourceFile): string {
  const full = node.getFullText(sourceFile).replace(/^\n+/, '');
  const lines = full.split('\n');
  if (lines.length <= MAXIMUM_SOURCE_LINES) return full.trimEnd();
  return [
    ...lines.slice(0, MAXIMUM_SOURCE_LINES),
    `// … ${lines.length - MAXIMUM_SOURCE_LINES} more lines`,
  ].join('\n');
}

function dedupeApiCalls(calls: readonly ApiCall[]): ApiCall[] {
  return [...new Map(calls.map((call) => [`${call.method} ${call.path}`, call])).values()];
}

function readLocalApiCalls(
  sourceFile: ts.SourceFile,
  clientIdentifier: string | null,
): Map<string, ApiCall[]> {
  if (clientIdentifier === null) return new Map();
  const own = new Map<string, ApiCall[]>();
  const references = new Map<string, Set<string>>();
  for (const statement of sourceFile.statements) {
    const named =
      ts.isFunctionDeclaration(statement) && statement.name !== undefined
        ? [[statement.name.text, statement] as const]
        : ts.isVariableStatement(statement)
          ? statement.declarationList.declarations.flatMap((declaration) =>
              ts.isIdentifier(declaration.name) && declaration.initializer !== undefined
                ? [[declaration.name.text, declaration.initializer] as const]
                : [],
            )
          : [];
    for (const [name, node] of named) {
      own.set(name, readApiCallsIn(node, sourceFile, clientIdentifier));
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
  sourceFile: ts.SourceFile,
  importLookup: Map<string, CallSymbol>,
  fileExternals: readonly string[],
  clientIdentifier: string | null,
): ExportedSymbol[] {
  const symbols: ExportedSymbol[] = [];
  const localCalls = readLocalApiCalls(sourceFile, clientIdentifier);

  const record = (name: string, node: ts.Node, isFunction: boolean): void => {
    const referenced = collectReferencedIdentifiers(node);
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
    const leadingText = node.getFullText(sourceFile).slice(0, node.getStart(sourceFile) - node.pos);
    const ownExternals = matchAll(DEPENDS_ON_EXTERNAL_TAG, leadingText);
    symbols.push({
      name,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
      isFunction,
      calls: [...calledFiles],
      callSymbols,
      dependsOnExternal: ownExternals.length > 0 ? ownExternals : [...fileExternals],
      tables: [...tables],
      apiCalls: dedupeApiCalls([
        ...readApiCallsIn(node, sourceFile, clientIdentifier),
        ...[...referenced].flatMap((identifier) => localCalls.get(identifier) ?? []),
      ]),
      blueprints: matchAll(BLUEPRINT_TAG, leadingText),
      followsBlueprints: matchAll(FOLLOWS_BLUEPRINT_TAG, leadingText),
      source: captureSource(node, sourceFile),
      lineCount: node.getFullText(sourceFile).replace(/^\n+/, '').split('\n').length,
      complexity: cognitiveComplexity(node),
      lintExceptions: (node.getFullText(sourceFile).match(LINT_DISABLE_PATTERN) ?? []).length,
    });
  };

  const hasExportModifier = (node: ts.Node): boolean =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((each) => each.kind === ts.SyntaxKind.ExportKeyword);

  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
      record(statement.name.text, statement, true);
      continue;
    }
    if (ts.isClassDeclaration(statement) && statement.name !== undefined) {
      record(statement.name.text, statement, false);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const initializer = declaration.initializer;
        const isFunction =
          initializer !== undefined &&
          (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer));
        record(declaration.name.text, statement, isFunction);
      }
    }
  }
  return symbols;
}

function readRoutesAndMounts(
  sourceFile: ts.SourceFile,
  importLookup: Map<string, CallSymbol>,
  localAliases: ReadonlyMap<string, CallSymbol>,
): { routes: RouteEntry[]; mounts: RouteMount[] } {
  const routes: RouteEntry[] = [];
  const mounts: RouteMount[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const methodName = node.expression.name.text;
      const firstArgument = node.arguments[0];
      if (firstArgument !== undefined && ts.isStringLiteral(firstArgument)) {
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
            path: firstArgument.text,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
            calls,
            routerVariable: findRouterVariable(node),
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
            basePath: firstArgument.text,
            routerFactory,
            targetFile: resolved?.file ?? null,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { routes, mounts };
}

function readApiCallsIn(
  root: ts.Node,
  sourceFile: ts.SourceFile,
  clientIdentifier: string | null,
): ApiCall[] {
  if (clientIdentifier === null) return [];
  const calls: ApiCall[] = [];

  const readChain = (node: ts.Expression): string[] | null => {
    const segments: string[] = [];
    let current: ts.Expression = node;
    for (;;) {
      if (ts.isIdentifier(current)) {
        return current.text === clientIdentifier ? segments.reverse() : null;
      }
      if (ts.isPropertyAccessExpression(current)) {
        segments.push(current.name.text);
        current = current.expression;
        continue;
      }
      if (ts.isElementAccessExpression(current)) {
        const argument = current.argumentExpression;
        if (!ts.isStringLiteral(argument)) return null;
        segments.push(argument.text);
        current = current.expression;
        continue;
      }
      return null;
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) && node.name.text.startsWith('$')) {
      const segments = readChain(node.expression);
      if (segments !== null) {
        calls.push({
          method: node.name.text.slice(1).toUpperCase(),
          path: `/${segments.join('/')}`,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return calls;
}

function readApiCalls(sourceFile: ts.SourceFile, clientIdentifier: string | null): ApiCall[] {
  return readApiCallsIn(sourceFile, sourceFile, clientIdentifier);
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
  const sourceFile = ts.createSourceFile(
    absolutePath,
    text,
    ts.ScriptTarget.ES2022,
    true,
    absolutePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

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
    complexity: cognitiveComplexity(sourceFile),
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

export function readScreenRoutes(
  sourceFile: ts.SourceFile,
  importLookup: ReadonlyMap<string, CallSymbol>,
): ScreenRoute[] {
  const found: ScreenRoute[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sourceFile) === 'Route') {
      let path: string | null = null;
      let component: string | null = null;
      for (const attribute of node.attributes.properties) {
        if (!ts.isJsxAttribute(attribute)) continue;
        const name = attribute.name.getText(sourceFile);
        const value = attribute.initializer;
        if (name === 'path' && value !== undefined && ts.isStringLiteral(value)) {
          path = value.text;
        }
        if (name === 'element' && value !== undefined && ts.isJsxExpression(value)) {
          const expression = value.expression;
          if (expression !== undefined && ts.isJsxSelfClosingElement(expression)) {
            component = expression.tagName.getText(sourceFile);
          }
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
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

export function readGestures(
  sourceFile: ts.SourceFile,
  identifiers: ReadonlySet<string>,
): GestureBinding[] {
  const found = new Map<string, GestureBinding>();
  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sourceFile);
      const value = node.initializer;
      if (/^on[A-Z]/.test(name) && value !== undefined && ts.isJsxExpression(value)) {
        const referenced = collectReferencedIdentifiers(value);
        if ([...identifiers].some((each) => referenced.has(each)) && !found.has(name)) {
          found.set(name, {
            event: name,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
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
  sourceFile: ts.SourceFile,
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
  const collectDeclarations = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      const bound: string[] = [];
      if (ts.isIdentifier(node.name)) bound.push(node.name.text);
      else if (ts.isObjectBindingPattern(node.name)) {
        for (const element of node.name.elements) {
          if (ts.isIdentifier(element.name)) bound.push(element.name.text);
        }
      }
      if (bound.length > 0) {
        declarations.push({
          names: bound,
          referenced: collectReferencedIdentifiers(node.initializer),
        });
      }
    }
    ts.forEachChild(node, collectDeclarations);
  };
  collectDeclarations(sourceFile);

  for (const names of localsByHook.values()) addLocalsDerivedFrom(names, declarations);

  return [...localsByHook.entries()].flatMap(([hook, names]) =>
    readGestures(sourceFile, names).map((gesture) => ({ ...gesture, hook })),
  );
}

export { isTestFile };
