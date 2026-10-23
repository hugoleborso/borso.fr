/** @Feature takes */

export interface RecordedAudio {
  readonly audio: Blob;
  readonly contentType: string;
  readonly startedAtEpochMilliseconds: number;
  readonly durationMilliseconds: number;
}

export type RecordingOutcome =
  | ({ readonly kind: 'recorded' } & RecordedAudio)
  | ({ readonly kind: 'interrupted' } & RecordedAudio);

export interface ActiveRecording {
  readonly startedAtEpochMilliseconds: number;
  readonly stop: () => Promise<RecordingOutcome>;
}

export type RecordingStart =
  | { readonly kind: 'started'; readonly recording: ActiveRecording }
  | { readonly kind: 'denied' }
  | { readonly kind: 'unsupported' };

export interface RecorderLike {
  readonly readMimeType: () => string;
  readonly isInactive: () => boolean;
  readonly start: () => void;
  readonly stop: () => void;
  readonly onChunk: (listener: (chunk: Blob) => void) => void;
  readonly onStop: (listener: () => void) => void;
}

export interface MicrophoneCapture {
  readonly recorder: RecorderLike;
  readonly release: () => void;
}

export interface VisibilityTarget {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener: (type: 'visibilitychange', listener: () => void) => void;
  removeEventListener: (type: 'visibilitychange', listener: () => void) => void;
}

export interface RecordingSurroundings {
  readonly visibility: VisibilityTarget;
  readonly now: () => number;
}

const PERMISSION_DENIED_ERRORS: ReadonlySet<string> = new Set(['NotAllowedError', 'SecurityError']);

export function isPermissionRefusal(error: unknown): boolean {
  return error instanceof DOMException && PERMISSION_DENIED_ERRORS.has(error.name);
}

// @FollowsBlueprint core-decision
export function beginRecording(
  environment: RecordingSurroundings,
  capture: MicrophoneCapture,
  onInterrupted: (outcome: RecordingOutcome) => void,
): ActiveRecording {
  const { recorder } = capture;
  const chunks: Blob[] = [];
  const startedAtEpochMilliseconds = environment.now();
  const stopRequests: ((outcome: RecordingOutcome) => void)[] = [];
  let isFinished = false;

  const collect = (): RecordedAudio => {
    const contentType = recorder.readMimeType();
    return {
      audio: new Blob(chunks, { type: contentType }),
      contentType,
      startedAtEpochMilliseconds,
      durationMilliseconds: environment.now() - startedAtEpochMilliseconds,
    };
  };

  const finish = (): void => {
    if (isFinished) return;
    isFinished = true;
    environment.visibility.removeEventListener('visibilitychange', checkAfterReturn);
    capture.release();
    const recorded = collect();
    if (stopRequests.length === 0) {
      onInterrupted({ kind: 'interrupted', ...recorded });
      return;
    }
    for (const settle of stopRequests) settle({ kind: 'recorded', ...recorded });
  };

  function checkAfterReturn(): void {
    if (environment.visibility.visibilityState !== 'visible') return;
    if (recorder.isInactive()) finish();
  }

  recorder.onChunk((chunk) => {
    chunks.push(chunk);
  });
  recorder.onStop(finish);
  environment.visibility.addEventListener('visibilitychange', checkAfterReturn);
  recorder.start();

  return {
    startedAtEpochMilliseconds,
    stop: () =>
      new Promise((resolve) => {
        stopRequests.push(resolve);
        if (recorder.isInactive()) finish();
        else recorder.stop();
      }),
  };
}
