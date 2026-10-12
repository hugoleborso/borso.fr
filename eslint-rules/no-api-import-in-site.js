import path from 'node:path';
import { isTypeOnlyModuleSource, onEveryModuleSource } from './module-source.js';
import { isSiteFile, toPosixPath } from './site-paths.js';

const MESSAGE =
  'A site imports one thing from its API, the router type, as `import type { AppRouter } from ' +
  "'@api/app'`, which the compiler erases. Anything else pulls a module of the back end into the " +
  'browser bundle and makes the screen depend on how a slice is organised. A rule both sides ' +
  'apply moves to `apps/<app>/domain/` and both import it from `@domain/*`; a rule only the API ' +
  "applies is not the screen's to repeat, so read its answer from the response. " +
  'See docs/standards/02-purity-and-core-files.md.';

const API_ALIAS_PREFIX = '@api/';
const ROUTER_MODULE_SPECIFIER = '@api/app';
const API_FOLDER_PATTERN = /(^|\/)apps\/[^/]+\/api\//;
const ROUTER_MODULE_PATTERN = /(^|\/)apps\/[^/]+\/api\/src\/app(\.[jt]s)?$/;
const RELATIVE_SPECIFIER_PATTERN = /^\.\.?\//;

function resolveRelativeSpecifier(filename, specifier) {
  return path.posix.join(path.posix.dirname(toPosixPath(filename)), specifier);
}

export function readApiTarget(filename, specifier) {
  if (specifier.startsWith(API_ALIAS_PREFIX)) {
    return { isRouterModule: specifier === ROUTER_MODULE_SPECIFIER };
  }
  if (!RELATIVE_SPECIFIER_PATTERN.test(specifier)) {
    return null;
  }
  const resolved = resolveRelativeSpecifier(filename, specifier);
  if (!API_FOLDER_PATTERN.test(resolved)) {
    return null;
  }
  return { isRouterModule: ROUTER_MODULE_PATTERN.test(resolved) };
}

function isRouterTypeImport(target, node) {
  return target.isRouterModule && isTypeOnlyModuleSource(node);
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid a site importing anything from its API but the router type.' },
    schema: [],
    messages: { apiImport: MESSAGE },
  },
  create(context) {
    if (!isSiteFile(context.filename)) {
      return {};
    }
    function reportApiSource(specifier, node, sourceNode) {
      const target = readApiTarget(context.filename, specifier);
      if (target === null || isRouterTypeImport(target, node)) {
        return;
      }
      context.report({ node: sourceNode, messageId: 'apiImport' });
    }
    return {
      ...onEveryModuleSource((specifier, node) => {
        reportApiSource(specifier, node, node.source);
      }),
      ImportExpression(node) {
        if (node.source.type === 'Literal' && typeof node.source.value === 'string') {
          reportApiSource(node.source.value, node, node.source);
        }
      },
    };
  },
};
