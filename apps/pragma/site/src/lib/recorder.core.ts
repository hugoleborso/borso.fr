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
export function isEndedByTheSystem(stopRequestCount: number): boolean {
  return stopRequestCount === 0;
}

// @FollowsBlueprint core-decision
export function isStoppedOnReturn(
  visibilityState: DocumentVisibilityState,
  isRecorderInactive: boolean,
): boolean {
  return visibilityState === 'visible' && isRecorderInactive;
}
