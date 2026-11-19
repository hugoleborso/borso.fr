import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readSceneSetting,
  SCENE_FONT_SIZE_KEY,
  SCENE_SCROLL_SPEED_KEY,
  sceneTransposeKeyOfSong,
  writeSceneSetting,
} from './scene-preferences.adapter';

function refuse(): never {
  throw new Error('blocked');
}

describe('the scene settings this device keeps', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is absent before the musician changes anything', () => {
    expect(readSceneSetting(SCENE_FONT_SIZE_KEY)).toBeNull();
  });

  it('keeps the zoom and the scroll speed apart', () => {
    writeSceneSetting(SCENE_FONT_SIZE_KEY, '30');
    writeSceneSetting(SCENE_SCROLL_SPEED_KEY, '50');
    expect(readSceneSetting(SCENE_FONT_SIZE_KEY)).toBe('30');
    expect(readSceneSetting(SCENE_SCROLL_SPEED_KEY)).toBe('50');
    expect(localStorage.getItem('pragma.scene.font-size')).toBe('30');
  });

  it('keeps one transposition per song', () => {
    writeSceneSetting(sceneTransposeKeyOfSong('song-a'), '-2');
    expect(readSceneSetting(sceneTransposeKeyOfSong('song-a'))).toBe('-2');
    expect(readSceneSetting(sceneTransposeKeyOfSong('song-b'))).toBeNull();
    expect(localStorage.getItem('pragma.scene.transpose.song-a')).toBe('-2');
  });

  it('reads nothing and writes nothing when the storage refuses', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(refuse);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse);
    expect(readSceneSetting(SCENE_FONT_SIZE_KEY)).toBeNull();
    expect(() => writeSceneSetting(SCENE_FONT_SIZE_KEY, '30')).not.toThrow();
  });
});
