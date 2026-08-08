/**
 * Shared path predicates for the front end rules.
 *
 * Six rules only make sense inside `apps/<app>/site/`, because a React rule
 * firing on a Lambda handler is noise, and three of those also need to know
 * which atomic design bucket a component sits in. Both questions are answered
 * from the file name rather than from the imports, which is what keeps the
 * rules from having to guess a component's role.
 *
 * Windows separators are normalised first, so a rule written against `/` works
 * on every checkout.
 *
 * See docs/standards/05-frontend-architecture.md.
 */

const SITE_FILE_PATTERN = /(^|\/)apps\/[^/]+\/site\//;
const COMPONENT_BUCKET_PATTERN = /(^|\/)components\/(atoms|molecules|organisms)\//;

export function toPosixPath(filename) {
  return filename.replaceAll('\\', '/');
}

export function isSiteFile(filename) {
  return SITE_FILE_PATTERN.test(toPosixPath(filename));
}

/**
 * The atomic design bucket the file lives in, or `null` when the file is not a
 * component, e.g. a route, a query module, or a back end file.
 *
 * @returns {'atoms' | 'molecules' | 'organisms' | null}
 */
export function readComponentBucket(filename) {
  const match = COMPONENT_BUCKET_PATTERN.exec(toPosixPath(filename));
  return match === null ? null : match[2];
}
