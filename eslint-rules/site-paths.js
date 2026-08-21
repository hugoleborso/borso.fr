const SITE_FILE_PATTERN = /(^|\/)apps\/[^/]+\/site\//;
const COMPONENT_BUCKET_PATTERN = /(^|\/)components\/(atoms|molecules|organisms)\//;

export function toPosixPath(filename) {
  return filename.replaceAll('\\', '/');
}

/**
 * @Blueprint lint-rule-predicate
 * @BlueprintName Shared Lint Rule Predicate
 * @BlueprintUsage Use for a question about a file or a node that more than one custom lint rule has to ask.
 * @BlueprintDescription Answers the question from the file name through a module level regular expression, after `toPosixPath` normalises Windows separators so one pattern written with forward slashes works on every checkout, and exports a named predicate rather than the pattern, so a rule reads as a sentence and the module is covered through the rule suites that call it.
 */
export function isSiteFile(filename) {
  return SITE_FILE_PATTERN.test(toPosixPath(filename));
}

export function readComponentBucket(filename) {
  const match = COMPONENT_BUCKET_PATTERN.exec(toPosixPath(filename));
  return match === null ? null : match[2];
}
