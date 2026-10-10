import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { isTestPath } from './impurity.js';
import { isSiteFile, toPosixPath } from './site-paths.js';

const MESSAGE =
  '`{{name}}` is already declared in `{{source}}`. A second copy in the site compiles and passes ' +
  'its own tests, then drifts from the one the API enforces, and the person filling the form ' +
  'learns it from a refused request. Move the declaration to `apps/<app>/domain/` and import it ' +
  'on both sides through `@domain/*`. When the two only share a name, rename the site one after ' +
  'what it does on the screen. See docs/standards/02-purity-and-core-files.md.';

const APPLICATION_ROOT_PATTERN = /^(.*?(?:^|\/)apps\/[^/]+)\/site\//;
const CONSTANT_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const UNIT_CONVERSION_PATTERN =
  /^(MILLISECONDS|SECONDS|MINUTES|HOURS|DAYS|BYTES|METRES|METERS)_PER_(SECOND|MINUTE|HOUR|DAY|WEEK|KIBIBYTE|MEBIBYTE|KILOBYTE|KILOMETRE|KILOMETER)$/;
const EXPORTED_CONSTANT_PATTERN = /^export\s+const\s+([A-Z][A-Z0-9_]*)\b/gm;
const SCHEMA_CONSTANT_PATTERN = /^const\s+([A-Z][A-Z0-9_]*)\b/gm;
const EXPORTED_FUNCTION_PATTERN = /^export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/gm;
const SCHEMA_FILE_PATTERN = /\.schema\.ts$/;
const PURE_FILE_PATTERN = /\.(core|utils)\.ts$/;
const TYPESCRIPT_SOURCE_PATTERN = /\.ts$/;
const DECLARATION_ROOTS = ['api/src', 'domain'];
const SKIPPED_FOLDERS = new Set(['node_modules', '__test']);

function collectNames(pattern, sourceText) {
  return [...sourceText.matchAll(pattern)].map((match) => match[1]);
}

export function isSharedRuleName(name) {
  return !UNIT_CONVERSION_PATTERN.test(name);
}

export function listContractDeclarations(relativePath, sourceText) {
  const constants = collectNames(EXPORTED_CONSTANT_PATTERN, sourceText);
  if (SCHEMA_FILE_PATTERN.test(relativePath)) {
    constants.push(...collectNames(SCHEMA_CONSTANT_PATTERN, sourceText));
  }
  const functions = PURE_FILE_PATTERN.test(relativePath)
    ? collectNames(EXPORTED_FUNCTION_PATTERN, sourceText)
    : [];
  return [...constants.filter(isSharedRuleName), ...functions];
}

function listSourceFiles(folder) {
  let entries;
  try {
    entries = readdirSync(folder, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const entryPath = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      return SKIPPED_FOLDERS.has(entry.name) ? [] : listSourceFiles(entryPath);
    }
    return TYPESCRIPT_SOURCE_PATTERN.test(entry.name) ? [entryPath] : [];
  });
}

export function readDeclarationsFromDisk(applicationRoot) {
  const declarations = new Map();
  for (const declarationRoot of DECLARATION_ROOTS) {
    for (const filePath of listSourceFiles(path.join(applicationRoot, declarationRoot))) {
      const relativePath = toPosixPath(path.relative(path.dirname(applicationRoot), filePath));
      if (isTestPath(relativePath)) continue;
      const sourceText = readFileSync(filePath, 'utf8');
      for (const name of listContractDeclarations(relativePath, sourceText)) {
        declarations.set(name, `apps/${relativePath}`);
      }
    }
  }
  return declarations;
}

export function readApplicationRoot(filename) {
  const match = APPLICATION_ROOT_PATTERN.exec(toPosixPath(filename));
  return match === null ? null : match[1];
}

function listModuleLevelNames(statement) {
  const declaration =
    statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
  if (declaration === null || declaration === undefined) return [];
  if (declaration.type === 'FunctionDeclaration' && declaration.id !== null) {
    return [declaration.id];
  }
  if (declaration.type === 'VariableDeclaration' && declaration.kind === 'const') {
    return declaration.declarations
      .map((declarator) => declarator.id)
      .filter(
        (identifier) =>
          identifier.type === 'Identifier' && CONSTANT_NAME_PATTERN.test(identifier.name),
      );
  }
  return [];
}

export function createRepeatedDeclarationRule(readDeclarations) {
  const declarationsByApplication = new Map();
  function declarationsOf(applicationRoot) {
    if (!declarationsByApplication.has(applicationRoot)) {
      declarationsByApplication.set(applicationRoot, readDeclarations(applicationRoot));
    }
    return declarationsByApplication.get(applicationRoot);
  }

  return {
    meta: {
      type: 'problem',
      docs: {
        description: 'Forbid a site redeclaring a constant or a pure function its API declares.',
      },
      schema: [],
      messages: { repeatedDeclaration: MESSAGE },
    },
    create(context) {
      const filename = context.filename;
      const applicationRoot = readApplicationRoot(filename);
      if (!isSiteFile(filename) || isTestPath(filename) || applicationRoot === null) {
        return {};
      }
      return {
        Program(program) {
          const declarations = declarationsOf(path.resolve(context.cwd, applicationRoot));
          for (const identifier of program.body.flatMap(listModuleLevelNames)) {
            const source = declarations.get(identifier.name);
            if (source !== undefined) {
              context.report({
                node: identifier,
                messageId: 'repeatedDeclaration',
                data: { name: identifier.name, source },
              });
            }
          }
        },
      };
    },
  };
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default createRepeatedDeclarationRule(readDeclarationsFromDisk);
