import { isTestPath } from './impurity.js';
import { toPosixPath } from './site-paths.js';

/**
 * A route owns routing concerns and composes organisms, and every other
 * component lives in `components/atoms/`, `components/molecules/` or
 * `components/organisms/`. The three buckets are the design review: a reviewer
 * answers "what primitives does this application have" by listing `atoms/`, and
 * the answer is only true while every component is in a bucket.
 *
 * A component parked in `routes/` is invisible to that review and to every rule
 * that runs off it. `readComponentBucket` returns `null` outside the three
 * folders, so `atomic-design-import-direction`, `atomic-design-composition` and
 * `no-query-hooks-outside-organisms` all fall silent there: a molecule that
 * fetches, an atom that imports an organism, and a bucket whose atoms were
 * never extracted are each legal as long as the file sits under `routes/`.
 * Sorting by route is what hides it, because `routes/catalog/` reads like a
 * home and a component with a route's name is not a component with a bucket.
 *
 * **The page predicate.** A route file is a page when its name ends in `Page`,
 * e.g. `CatalogPage.tsx`, `SongDetailPage.tsx`, `AdminPage.tsx`. The suffix is
 * the only mark a page carries here: `routes/` holds a folder per route rather
 * than a file per route, so the folder cannot say which of its files the router
 * renders, no import direction separates the two, and a page's source reads the
 * same as a component's.
 *
 * The suffix was chosen by reading every route file in the repository rather
 * than by preference. Sixteen of the eighteen files a router renders carry it,
 * across all three applications that have a `routes/` folder. The two that do
 * not are `pragma`'s `Login.tsx` and `borsouvertures`'s
 * `OpeningTrainerRoute.tsx`, and both are reported here, because a second
 * accepted spelling would let any component escape the buckets by ending its
 * name in the second word. The rename is the second of the two remedies the
 * message names, and for those two files it is the right one.
 *
 * The reported bucket is the one the standard's own question picks: a component
 * that imports no component is an atom, one that imports only atoms is a
 * molecule, and one that imports a molecule or an organism, calls a query hook,
 * or holds state is an organism.
 *
 * What this deliberately allows:
 *
 * - `<Something>Page.tsx`, the route's page.
 * - A `.ts` module beside the page, e.g. `catalog-page.core.ts` and
 *   `chart-kind.utils.ts`, which is where a route's pure helpers belong.
 * - A test file, which renders markup to assert on it.
 * - A `.tsx` file that exports no component, e.g. a module of typed constants.
 * - Everything outside an application's `routes/` folder, in either site
 *   layout.
 *
 * See docs/standards/05-frontend-architecture.md.
 */
const MESSAGE =
  '`{{component}}` is a component sitting in `routes/`, where the three buckets cannot see it ' +
  'and no atomic design rule runs. Move it to `components/{{bucket}}/{{component}}.tsx` and ' +
  "compose it from the route. When this file is the route's page, name it " +
  '`<Route>Page.tsx`, which is what marks a page here. ' +
  'See docs/standards/05-frontend-architecture.md.';

// Both site layouts, because `borso-fr` and `borsouvertures` put their sources
// directly under `site/` where `pragma` and `last-loop-lepin` use `site/src/`.
const ROUTE_COMPONENT_PATTERN = /(^|\/)apps\/[^/]+\/site\/(src\/)?routes\/.*\.tsx$/;

const PAGE_FILE_PATTERN = /(^|\/)[A-Z][A-Za-z0-9]*Page\.tsx$/;

const COMPONENT_BUCKET_IN_SOURCE = /(^|\/)components\/(atoms|molecules|organisms)(\/|$)/;

const QUERY_HOOKS = new Set(['useQuery', 'useMutation', 'useInfiniteQuery', 'useSuspenseQuery']);

const STATE_HOOKS = new Set(['useState', 'useReducer']);

/**
 * `PascalCase`, which is React's own mark of a component and the repository's
 * file naming rule. The trailing lowercase letter is what keeps `ICONS` out,
 * since a constant exported from a route module is not a component.
 */
const COMPONENT_NAME_PATTERN = /^[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*$/;

/**
 * A declaration that carries a value at runtime. An interface and a type alias
 * are erased, and `ConcertReadViewProps` is PascalCase, so counting them would
 * name a props type where the message means to name the component.
 */
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
