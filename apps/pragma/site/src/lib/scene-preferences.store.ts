/** @Feature songs */

import { useSyncExternalStore } from 'react';
import {
  clampSceneFontSize,
  clampSceneScrollSpeed,
  clampSemitoneOffset,
  parseSceneSetting,
  SCENE_FONT_SIZE_DEFAULT_PX,
  SCENE_SCROLL_SPEED_DEFAULT_PX_PER_SECOND,
} from '../routes/catalog/scene-view.core';
import {
  readSceneSetting,
  SCENE_FONT_SIZE_KEY,
  SCENE_SCROLL_SPEED_KEY,
  sceneTransposeKeyOfSong,
  writeSceneSetting,
} from './scene-preferences.adapter';

type Listener = () => void;

const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const NO_TRANSPOSITION = 0;
const NO_SONG_KEY = sceneTransposeKeyOfSong('');

interface StoredSceneNumber {
  readonly value: number;
  readonly save: (next: number) => number;
}

function useStoredSceneNumber(
  key: string,
  fallback: number,
  clamp: (value: number) => number,
): StoredSceneNumber {
  const value = useSyncExternalStore(
    subscribe,
    () => clamp(parseSceneSetting(readSceneSetting(key), fallback)),
    () => fallback,
  );
  return {
    value,
    save: (next) => {
      const kept = clamp(next);
      writeSceneSetting(key, String(kept));
      for (const listener of listeners) listener();
      return kept;
    },
  };
}

export interface ScenePreferences {
  readonly semitones: number;
  readonly fontSizePx: number;
  readonly scrollSpeedPxPerSecond: number;
  readonly transposeBy: (delta: number) => void;
  readonly zoomBy: (delta: number) => void;
  readonly saveScrollSpeed: (pixelsPerSecond: number) => number;
}

// @FollowsBlueprint hook-external-store
export function useScenePreferences(songId: string | undefined): ScenePreferences {
  const transposition = useStoredSceneNumber(
    songId === undefined ? NO_SONG_KEY : sceneTransposeKeyOfSong(songId),
    NO_TRANSPOSITION,
    clampSemitoneOffset,
  );
  const fontSize = useStoredSceneNumber(
    SCENE_FONT_SIZE_KEY,
    SCENE_FONT_SIZE_DEFAULT_PX,
    clampSceneFontSize,
  );
  const scrollSpeed = useStoredSceneNumber(
    SCENE_SCROLL_SPEED_KEY,
    SCENE_SCROLL_SPEED_DEFAULT_PX_PER_SECOND,
    clampSceneScrollSpeed,
  );
  return {
    semitones: transposition.value,
    fontSizePx: fontSize.value,
    scrollSpeedPxPerSecond: scrollSpeed.value,
    transposeBy: (delta) => {
      transposition.save(transposition.value + delta);
    },
    zoomBy: (delta) => {
      fontSize.save(fontSize.value + delta);
    },
    saveScrollSpeed: scrollSpeed.save,
  };
}
