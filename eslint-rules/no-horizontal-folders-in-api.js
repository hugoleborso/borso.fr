import { toPosixPath } from './site-paths.js';

/**
 * The back end is organised as vertical slices, so `api/src/songs/` holds the
 * controller, the service, the repository, the schema and the pure rules of one
 * bounded context, and reading that feature means opening one folder.
 *
 * A horizontal folder sorts by layer instead. `api/src/services/` reads like an
 * answer, and it costs a reader four directories to assemble one feature, so the
 * question "what does this context own" stops having a place to be answered.
 * `api/src/domain/` is the same defect wearing the word the domain is supposed
 * to name: every rule in `api/src/` has an owning context, so a `.core.ts` lives
 * inside that context's folder rather than in a shared pile.
 *
 * The rule reads the first folder under `api/src/`, because that is where a
 * bounded context's name goes. A folder deeper inside a context is that
 * context's business, e.g. `helpers/gpx/`.
 *
 * What this deliberately allows:
 *
 * - `apps/<app>/domain/`, the workspace level sibling of `api/` and `site/`.
 *   ADR-0010 gives it to the rules both sides of an application read, and it is
 *   a different folder from `api/src/domain/` in both path and purpose: it is
 *   reached through `@domain/*` by the front end as well, and its admission bar
 *   is two callers on opposite sides of the boundary.
 * - `api/src/helpers/<topic>/`, which CLAUDE.md gives to the cross cutting
 *   helpers that belong to no one context, e.g. `helpers/geo/`, `helpers/gpx/`
 *   and `helpers/sun/`.
 * - `api/src/database/`, the client and the migrations, which are the
 *   application's connection rather than a layer of its features.
 * - A bounded context whose name happens to be plural, e.g. `setlists/`,
 *   `songs/`, `members/`. Only the five names the standard lists are reported,
 *   so a context is never mistaken for an aggregator.
 * - Everything outside `apps/<app>/api/src/`, including `site/src/routes/`,
 *   which is where sorting by feature belongs, and `infra/`.
 *
 * A test beside a misplaced file is not exempt, because the test moves with the
 * file it covers, and exempting it would leave half the slice behind.
 *
 * See docs/standards/04-backend-architecture.md,
 * docs/standards/02-purity-and-core-files.md and
 * docs/adr/0010-pragma-domain-folder-for-cross-boundary-rules.md.
 */
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
