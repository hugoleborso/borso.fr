import { isTestPath } from './impurity.js';
import { toPosixPath } from './site-paths.js';

const MESSAGE =
  '`{{component}}` is a component sitting in `routes/`, where the three buckets cannot see it ' +
  'and no atomic design rule runs. Move it to `components/{{bucket}}/{{component}}.tsx` and ' +
  "compose it from the route. When this file is the route's page, name it " +
  '`<Route>Page.tsx`, which is what marks a page here. ' +
  'See docs/standards/05-frontend-architecture.md.';

const ROUTE_COMPONENT_PATTERN = /(^|\/)apps\/[^/]+\/site\/(src\/)?routes\/.*\.tsx$/;

const PAGE_FILE_PATTERN = /(^|\/)[A-Z][A-Za-z0-9]*Page\.tsx$/;

const COMPONENT_BUCKET_IN_SOURCE = /(^|\/)components\/(atoms|molecules|organisms)(\/|$)/;

const QUERY_HOOKS = new Set(['useQuery', 'useMutation', 'useInfiniteQuery', 'useSuspenseQuery']);

const STATE_HOOKS = new Set(['useState', 'useReducer']);

const COMPONENT_NAME_PATTERN = /^[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*$/;

const VALUE_DECLARATION_TYPES = new Set([
  'ClassDeclaration',
  'FunctionDeclaration',
  'VariableDeclaration',
]);

function isRouteComponentFile(filename) {
  return ROUTE_COMPONENT_PATTERN.test(filename) && !PAGE_FILE_PATTERN.test(filename);
}

function readImportedBucket(source) {
  const match = COMPONENT_BUCKET_IN_SOURCE.exec(source);
  return match === null ? null : match[2];
}

function selectBucket({ importsComposition, holdsState, importsAtom }) {
  if (importsComposition || holdsState) {
    return 'organisms';
  }
  return importsAtom ? 'molecules' : 'atoms';
}

function listExportedNames(node) {
  if (node.type === 'ExportDefaultDeclaration') {
    return readDeclaredNames(node.declaration);
  }
  if (node.exportKind === 'type') {
    return [];
  }
  const specifierNames = (node.specifiers ?? [])
    .filter((specifier) => (specifier.exportKind ?? 'value') === 'value')
    .map((specifier) => specifier.exported.name);
  return node.declaration === null || node.declaration === undefined
    ? specifierNames
    : [...specifierNames, ...readDeclaredNames(node.declaration)];
}

function readDeclaredNames(declaration) {
  if (declaration.type === 'Identifier') {
    return [declaration.name];
  }
  if (!VALUE_DECLARATION_TYPES.has(declaration.type)) {
    return [];
  }
  if (declaration.type === 'VariableDeclaration') {
    return declaration.declarations
      .filter((declarator) => declarator.id.type === 'Identifier')
      .map((declarator) => declarator.id.name);
  }
  return declaration.id?.name === undefined ? [] : [declaration.id.name];
}

function readCalleeName(callee) {
  return callee.type === 'Identifier' ? callee.name : null;
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Keep every component that is not a page out of the routes folder.' },
    schema: [],
    messages: { componentOutsideBucket: MESSAGE },
  },
  create(context) {
    const filename = toPosixPath(context.filename);
    if (!isRouteComponentFile(filename) || isTestPath(filename)) {
      return {};
    }
    const exportedComponentNames = [];
    const evidence = { importsComposition: false, holdsState: false, importsAtom: false };
    let hasMarkup = false;
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') {
          return;
        }
        const bucket = readImportedBucket(source);
        if (bucket === 'atoms') {
          evidence.importsAtom = true;
        }
        if (bucket === 'molecules' || bucket === 'organisms') {
          evidence.importsComposition = true;
        }
      },
      CallExpression(node) {
        const hook = readCalleeName(node.callee);
        if (hook !== null && (QUERY_HOOKS.has(hook) || STATE_HOOKS.has(hook))) {
          evidence.holdsState = true;
        }
      },
      JSXElement() {
        hasMarkup = true;
      },
      JSXFragment() {
        hasMarkup = true;
      },
      'ExportNamedDeclaration, ExportDefaultDeclaration'(node) {
        for (const name of listExportedNames(node)) {
          if (COMPONENT_NAME_PATTERN.test(name)) {
            exportedComponentNames.push(name);
          }
        }
      },
      'Program:exit'(node) {
        if (!hasMarkup || exportedComponentNames.length === 0) {
          return;
        }
        context.report({
          node,
          messageId: 'componentOutsideBucket',
          data: { component: exportedComponentNames[0], bucket: selectBucket(evidence) },
        });
      },
    };
  },
};
