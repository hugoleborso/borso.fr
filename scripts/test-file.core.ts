// @FollowsBlueprint utils-pure-module
export const TEST_FILE_PATTERN = /\.test\.(ts|tsx|js)$/u;
const TEST_HELPER_PATTERN =
  /(\.test-utils\.tsx?|\/test-setup\.tsx?$|^apps\/[^/]+\/test\/|\/test\/(unit\/)?(fixtures|helpers)\/)/u;

export function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERN.test(filePath) || TEST_HELPER_PATTERN.test(filePath);
}
