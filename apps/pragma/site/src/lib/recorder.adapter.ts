/**
 * @DependsOnExternal browser-media-recorder
 * @Feature takes
 */

import {
  type ActiveRecording,
  isEndedByTheSystem,
  isPermissionRefusal,
  isStoppedOnReturn,
  type MicrophoneCapture,
  type RecordedAudio,
  type RecorderLike,
  type RecordingOutcome,
  type RecordingStart,
  type RecordingSurroundings,
} from './recorder.core';

export interface RecorderEnvironment extends RecordingSurroundings {
  readonly openMicrophone: () => Promise<MicrophoneCapture>;
}

const CHUNK_INTERVAL_MILLISECONDS = 1_000;
const DENIED: RecordingStart = { kind: 'denied' };
const UNSUPPORTED: RecordingStart = { kind: 'unsupported' };
const NOT_SUPPORTED_ERROR = 'NotSupportedError';
const RECORDING_UNAVAILABLE = 'recording is not available here';

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
    const isInterrupted = isEndedByTheSystem(stopRequests.length);
    if (isInterrupted) {
      onInterrupted({ kind: 'interrupted', ...recorded });
      return;
    }
    for (const settle of stopRequests) settle({ kind: 'recorded', ...recorded });
  };

  function checkAfterReturn(): void {
    const hasStoppedWhileAway = isStoppedOnReturn(
      environment.visibility.visibilityState,
      recorder.isInactive(),
    );
    if (hasStoppedWhileAway) finish();
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
        const isAlreadyStopped = recorder.isInactive();
        if (isAlreadyStopped) {
          finish();
          return;
        }
        recorder.stop();
      }),
  };
}

// @FollowsBlueprint adapter-outcome-instead-of-a-throw
export async function startRecording(
  environment: RecorderEnvironment,
  onInterrupted: (outcome: RecordingOutcome) => void,
): Promise<RecordingStart> {
  try {
    const capture = await environment.openMicrophone();
    return { kind: 'started', recording: beginRecording(environment, capture, onInterrupted) };
  } catch (error) {
    const isRefused = isPermissionRefusal(error);
    return isRefused ? DENIED : UNSUPPORTED;
  }
}

const AUDIO_ONLY: MediaStreamConstraints = { audio: true };

function wrapMediaRecorder(recorder: MediaRecorder): RecorderLike {
  return {
    readMimeType: () => recorder.mimeType,
    isInactive: () => recorder.state === 'inactive',
    start: () => recorder.start(CHUNK_INTERVAL_MILLISECONDS),
    stop: () => recorder.stop(),
    onChunk: (listener) => {
      recorder.addEventListener('dataavailable', (event) => listener(event.data));
    },
    onStop: (listener) => {
      recorder.addEventListener('stop', listener);
    },
  };
}

async function openBrowserMicrophone(): Promise<MicrophoneCapture> {
  if (!('mediaDevices' in navigator) || typeof MediaRecorder === 'undefined') {
    throw new DOMException(RECORDING_UNAVAILABLE, NOT_SUPPORTED_ERROR);
  }
  const stream = await navigator.mediaDevices.getUserMedia(AUDIO_ONLY);
  return {
    recorder: wrapMediaRecorder(new MediaRecorder(stream)),
    release: () => {
      for (const track of stream.getTracks()) track.stop();
    },
  };
}

export function readBrowserRecorderEnvironment(): RecorderEnvironment {
  return {
    openMicrophone: openBrowserMicrophone,
    visibility: document,
    now: () => Date.now(),
  };
}

export interface AudioDurationEnvironment {
  readonly createObjectUrl: (file: Blob) => string;
  readonly revokeObjectUrl: (url: string) => void;
  readonly createAudio: () => AudioProbe;
}

export interface AudioProbe {
  src: string;
  preload: string;
  readonly duration: number;
  onloadedmetadata: ((event: Event) => void) | null;
  onerror: ((event: Event | string) => void) | null;
}

const SECONDS_TO_MILLISECONDS = 1_000;
const METADATA_ONLY = 'metadata';

export function readAudioDurationMilliseconds(
  file: Blob,
  environment: AudioDurationEnvironment,
): Promise<number> {
  return new Promise((resolve) => {
    const url = environment.createObjectUrl(file);
    const probe = environment.createAudio();
    const settle = (durationMilliseconds: number): void => {
      environment.revokeObjectUrl(url);
      resolve(durationMilliseconds);
    };
    probe.onloadedmetadata = () => settle(probe.duration * SECONDS_TO_MILLISECONDS);
    probe.onerror = () => settle(Number.NaN);
    probe.preload = METADATA_ONLY;
    probe.src = url;
  });
}

export function readBrowserAudioDurationEnvironment(): AudioDurationEnvironment {
  return {
    createObjectUrl: (file) => URL.createObjectURL(file),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    createAudio: () => document.createElement('audio'),
  };
}
