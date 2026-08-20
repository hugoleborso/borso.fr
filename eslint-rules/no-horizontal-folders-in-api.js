import { toPosixPath } from './site-paths.js';

const MESSAGE =
  '`api/src/{{folder}}/` sorts the back end by layer. Every rule in `api/src/` has an owning ' +
  "bounded context, so move this file into `api/src/<context>/` beside that context's " +
  'controller, service, repository and schema. A helper that belongs to no context goes to ' +
  '`api/src/helpers/<topic>/`, and a rule both sides of the application read goes to the ' +
  'workspace level `apps/<app>/domain/` of ADR-0010, which is a different folder from this ' +
  'one. See docs/standards/04-backend-architecture.md.';

const API_SOURCE_FOLDER_PATTERN = /(^|\/)apps\/[^/]+\/api\/src\/([^/]+)\/[^/]/;

const HORIZONTAL_FOLDERS = new Set(['controllers', 'domain', 'repositories', 'routes', 'services']);

function readHorizontalFolder(filename) {
  const match = API_SOURCE_FOLDER_PATTERN.exec(filename);
  if (match === null) {
    return null;
  }
  const firstFolder = match[2];
  return HORIZONTAL_FOLDERS.has(firstFolder) ? firstFolder : null;
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Keep every back end file inside the bounded context that owns it.' },
    schema: [],
    messages: { horizontalFolderInApi: MESSAGE },
  },
  create(context) {
    const folder = readHorizontalFolder(toPosixPath(context.filename));
    if (folder === null) {
      return {};
    }
    return {
      Program(node) {
        context.report({ node, messageId: 'horizontalFolderInApi', data: { folder } });
      },
    };
  },
};
