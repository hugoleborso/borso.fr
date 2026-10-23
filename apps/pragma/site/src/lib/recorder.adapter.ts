/**
 * @DependsOnExternal browser-media-recorder
 * @Feature takes
 */

import {
  beginRecording,
  isPermissionRefusal,
  type MicrophoneCapture,
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
