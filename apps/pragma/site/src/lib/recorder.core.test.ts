import { describe, expect, it, vi } from 'vitest';
import { beginRecording, isPermissionRefusal, type RecorderLike } from './recorder.core';

// @FollowsBlueprint test-pure-unit
describe('isPermissionRefusal', () => {
  it('reads a refused or insecure microphone as a refusal', () => {
    expect(isPermissionRefusal(new DOMException('no', 'NotAllowedError'))).toBe(true);
    expect(isPermissionRefusal(new DOMException('no', 'SecurityError'))).toBe(true);
  });

  it('reads any other failure as something else', () => {
    expect(isPermissionRefusal(new DOMException('none', 'NotFoundError'))).toBe(false);
    expect(isPermissionRefusal(new Error('NotAllowedError'))).toBe(false);
  });
});

describe('beginRecording', () => {
  it('starts the recorder and stamps the start from the clock it is given', async () => {
    let isInactive = true;
    const stopListeners: (() => void)[] = [];
    const recorder: RecorderLike = {
      readMimeType: () => 'audio/mp4',
      isInactive: () => isInactive,
      start: () => {
        isInactive = false;
      },
      stop: () => {
        isInactive = true;
        for (const listener of stopListeners) listener();
      },
      onChunk: vi.fn(),
      onStop: (listener) => stopListeners.push(listener),
    };
    const visibility = {
      visibilityState: 'visible' as const,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const release = vi.fn();
    const onInterrupted = vi.fn();

    const recording = beginRecording(
      { visibility, now: () => 42 },
      { recorder, release },
      onInterrupted,
    );

    expect(recording.startedAtEpochMilliseconds).toBe(42);
    expect(isInactive).toBe(false);
    const outcome = await recording.stop();
    expect(outcome).toMatchObject({ kind: 'recorded', contentType: 'audio/mp4' });
    expect(onInterrupted).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
    expect(visibility.removeEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
  });
});
