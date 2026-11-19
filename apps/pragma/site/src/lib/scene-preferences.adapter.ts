/**
 * @Feature songs
 * @DependsOnExternal browser-local-storage
 */

const SCENE_KEY_PREFIX = 'pragma.scene.';
export const SCENE_FONT_SIZE_KEY = `${SCENE_KEY_PREFIX}font-size`;
export const SCENE_SCROLL_SPEED_KEY = `${SCENE_KEY_PREFIX}scroll-speed`;

// @FollowsBlueprint adapter-storage-keyed-by-record
export function sceneTransposeKeyOfSong(songId: string): string {
  return `${SCENE_KEY_PREFIX}transpose.${songId}`;
}

export function readSceneSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Stryker disable BlockStatement: equivalent mutant. An empty catch block swallows the storage refusal exactly as this one does.
export function writeSceneSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}
// Stryker restore BlockStatement
