/**
 * Builds the architecture graph of one application by parsing its source with
 * the TypeScript compiler API.
 *
 * Everything here is derived, never authored. A node's position comes from its
 * path and its file-name suffix, its edges come from real import and identifier
 * references, and its HTTP routes come from the Hono call chain as written. The
 * only hand-written inputs are the manifest, which names the actors and
 * external systems that no single source file owns, and the `@DependsOnExternal`
 * and `@Feature` tags, which record the two facts a path cannot carry.
 *
 * The layer inference is shared with the blueprint scripts rather than
 * duplicated, so a rename cannot make the two disagree.
 */

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
  /** Repo-relative paths of files this symbol references through an import. */
  readonly calls: readonly string[];
  /** Imported identifiers this symbol references, paired with their file. */
  readonly callSymbols: readonly CallSymbol[];
  /**
   * External systems this symbol reaches. Read from the symbol's own JSDoc when
   * it carries a tag, and inherited from the file otherwise, which is correct
   * for a file whose whole purpose is one external such as a repository holding
   * the S3 client. Attributing at the symbol keeps a route that never calls
   * MusicBrainz from claiming it does.
   */
  readonly dependsOnExternal: readonly string[];
  /** Drizzle tables this symbol references by name. */
  readonly tables: readonly string[];
  /** Endpoints this symbol calls through the typed client. */
  readonly apiCalls: readonly ApiCall[];
}

export interface CallSymbol {
  readonly name: string;
  readonly file: string | null;
  readonly packageName: string | null;
}

export interface ImportEdge {
  /** Repo-relative path when the import resolves inside the repository. */
  readonly targetFile: string | null;
  /** Package name when the import leaves the repository. */
  readonly packageName: string | null;
  readonly namedBindings: readonly string[];
  readonly isTypeOnly: boolean;
}

export interface RouteEntry {
  readonly method: string;
  readonly path: string;
  readonly line: number;
  /** Identifiers referenced inside the handler that came from an import. */
  readonly calls: readonly CallSymbol[];
  /**
   * The router this route was chained onto, named by the variable holding it or
   * by the factory function returning it. A controller exporting several
   * routers mounts them at different base paths, so the route cannot be given a
   * full path without knowing which one it belongs to.
   */
  readonly routerVariable: string;
}

export interface ArchitectureFile {
  readonly path: string;
  readonly application: string;
  readonly container: string;
  readonly layer: string;
  readonly context: string;
  readonly feature: string | null;
  readonly lineCount: number;
  readonly blueprints: readonly string[];
  readonly followsBlueprints: readonly string[];
  readonly dependsOnExternal: readonly string[];
  readonly exports: readonly ExportedSymbol[];
  readonly imports: readonly ImportEdge[];
  readonly routes: readonly RouteEntry[];
  readonly tables: readonly string[];
  readonly mounts: readonly RouteMount[];
  readonly apiCalls: readonly ApiCall[];
  /**
   * String literals naming an API path. The service worker and anything else
   * that fetches by URL never appears in `apiCalls`, so a route reached only
   * that way would otherwise read as unreachable.
   */
  readonly urlStrings: readonly string[];
}

export interface RouteMount {
  readonly basePath: string;
  readonly routerFactory: string;
  readonly targetFile: string | null;
}

/**
 * Names bound by a destructuring whose initialiser calls an import, so that
 * `const { publicRouter } = buildAuthRouter()` resolves `publicRouter` back to
 * the module `buildAuthRouter` came from.
 */
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

/** The variable or function that owns the Hono chain a route sits on. */
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

/**
 * Resolve an import specifier to a repo-relative path, or to the package name
 * when it leaves the repository. Mirrors the `@api`, `@site` and `@domain`
 * aliases the workspace tsconfig declares.
 */
function resolveSpecifier(
  specifier: string,
  containingFile: string,
  repositoryRoot: string,
  applicationRoot: string,
): { targetFile: string | null; packageName: string | null } {
  const aliasPrefixes: readonly (readonly [string, string])[] = [
    ['@api/', join(applicationRoot, 'api/src')],
    ['@site/', join(applicationRoot, 'site/src')],
    ['@domain/', join(applicationRoot, 'domain')],
  ];

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

function readExportedSymbols(
  sourceFile: ts.SourceFile,
  importLookup: Map<string, CallSymbol>,
  fileExternals: readonly string[],
  clientIdentifier: string | null,
): ExportedSymbol[] {
  const symbols: ExportedSymbol[] = [];

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
      apiCalls: readApiCallsIn(node, sourceFile, clientIdentifier),
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

/**
 * Walk the Hono call chain and read every route and mount off it.
 *
 * The routers in this repository are one unbroken chained expression, because
 * breaking the chain drops the accumulated route types the front end reads, so
 * the chain is also the complete list of routes and can be traversed as one.
 */
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

/**
 * Read the endpoints a front-end module calls off the Hono RPC client.
 *
 * A call reads `api.api.songs[':id'].$put(...)`, so the method is the property
 * beginning with a dollar and the path is the chain of property names and
 * string subscripts between the client identifier and that method. Reading it
 * this way means the front-to-back edges come from the calls themselves, not
 * from matching a query module's name against a bounded context.
 */
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

/** Every endpoint the file calls, wherever in it the call sits. */
function readApiCalls(sourceFile: ts.SourceFile, clientIdentifier: string | null): ApiCall[] {
  return readApiCallsIn(sourceFile, sourceFile, clientIdentifier);
}

const API_PATH_STRING = /['"`](\/api\/[A-Za-z0-9\-_/:]*)['"`]/g;

/** Every string literal in the file that names an API path. */
export function readApiPathStrings(text: string): string[] {
  return [...new Set(matchAll(API_PATH_STRING, text))];
}

/** Drizzle table identifiers a repository reads, taken from its schema import. */
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
  const apiMatch = /\/api\/src\/([^/]+)\//.exec(filePath);
  if (container === 'api' && apiMatch !== null) {
    return apiMatch[1];
  }
  if (container === 'api') return 'root';
  if (container === 'domain') return 'domain';
  if (container === 'cdk') return 'cdk';
  const routeMatch = /\/site\/src\/routes\/([^/]+)\//.exec(filePath);
  if (routeMatch !== null) return routeMatch[1];
  const componentMatch = /\/site\/src\/components\/([^/]+)\//.exec(filePath);
  if (componentMatch !== null) return componentMatch[1];
  if (filePath.includes('/site/src/lib/queries/')) return 'queries';
  const siteMatch = /\/site\/src\/([^/]+)\//.exec(filePath);
  if (siteMatch !== null) return siteMatch[1];
  return 'root';
}

export function buildArchitectureFile(
  absolutePath: string,
  repositoryRoot: string,
  applicationRoot: string,
): ArchitectureFile {
  const relativePath = relative(repositoryRoot, absolutePath);
  const text = readFileSync(absolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    absolutePath,
    text,
    ts.ScriptTarget.ES2022,
    true,
    absolutePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  /**
   * A tag in the file header describes the whole module, so every export
   * inherits it. A tag deeper in the file belongs to the one declaration it
   * sits above and must not spread, which is why the header is cut out here
   * rather than the whole text being reused.
   */
  const firstImportIndex = text.indexOf('\nimport ');
  const headerText = firstImportIndex === -1 ? text : text.slice(0, firstImportIndex);
  const headerExternals = matchAll(DEPENDS_ON_EXTERNAL_TAG, headerText);

  const imports = readImports(sourceFile, absolutePath, repositoryRoot, applicationRoot);
  const importLookup = buildImportLookup(imports);
  const container = inferProject(relativePath);
  const featureMatch = FEATURE_TAG.exec(text);
  const localAliases = buildLocalAliases(sourceFile, importLookup);
  const { routes, mounts } = readRoutesAndMounts(sourceFile, importLookup, localAliases);
  const clientBinding = imports
    .filter((edge) => edge.targetFile?.endsWith('.client.ts') === true)
    .flatMap((edge) => edge.namedBindings)
    .find((binding) => binding === 'api');

  return {
    path: relativePath,
    application: inferApplication(relativePath),
    container,
    layer: inferLayer(relativePath),
    context: inferContext(relativePath, container),
    feature: featureMatch === null ? null : featureMatch[1],
    lineCount: text.split('\n').length,
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
  };
}

export { isTestFile };
