import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type AudioProbe,
  beginRecording,
  readAudioDurationMilliseconds,
  readBrowserAudioDurationEnvironment,
  readBrowserRecorderEnvironment,
  type RecorderEnvironment,
  startRecording,
} from './recorder.adapter';
import type { MicrophoneCapture, RecorderLike, RecordingOutcome } from './recorder.core';

const STARTED_AT = 1_000_000;
const RECORDED_MILLISECONDS = 137_000;
const WEBM = 'audio/webm;codecs=opus';

function createFakeRecorder(mimeType = WEBM) {
  const chunkListeners: ((chunk: Blob) => void)[] = [];
  const stopListeners: (() => void)[] = [];
  let isInactive = true;
  let stopCalls = 0;
  const recorder: RecorderLike = {
    readMimeType: () => mimeType,
    isInactive: () => isInactive,
    start: () => {
      isInactive = false;
    },
    stop: () => {
      if (isInactive) throw new DOMException('not recording', 'InvalidStateError');
      stopCalls += 1;
      isInactive = true;
      for (const listener of stopListeners) listener();
    },
    onChunk: (listener) => chunkListeners.push(listener),
    onStop: (listener) => stopListeners.push(listener),
  };
  return {
    recorder,
    readStopCalls: () => stopCalls,
    emitChunk: (chunk: Blob) => {
      for (const listener of chunkListeners) listener(chunk);
    },
    stopBySystem: () => {
      isInactive = true;
      for (const listener of stopListeners) listener();
    },
    stopSilently: () => {
      isInactive = true;
    },
  };
}

function createVisibility() {
  const listeners = new Set<() => void>();
  let visibilityState: DocumentVisibilityState = 'visible';
  const target = {
    get visibilityState(): DocumentVisibilityState {
      return visibilityState;
    },
    addEventListener: (type: string, listener: () => void) => {
      if (type === 'visibilitychange') listeners.add(listener);
    },
    removeEventListener: (type: string, listener: () => void) => {
      if (type === 'visibilitychange') listeners.delete(listener);
    },
  };
  return {
    target,
    listeners,
    change: (state: DocumentVisibilityState) => {
      visibilityState = state;
      for (const listener of listeners) listener();
    },
  };
}

function createEnvironment(capture: Promise<MicrophoneCapture>) {
  const visibility = createVisibility();
  let now = STARTED_AT;
  const environment: RecorderEnvironment = {
    openMicrophone: () => capture,
    visibility: visibility.target,
    now: () => now,
  };
  return {
    environment,
    visibility,
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
  };
}

async function startWith(fake: ReturnType<typeof createFakeRecorder>) {
  const release = vi.fn();
  const setup = createEnvironment(Promise.resolve({ recorder: fake.recorder, release }));
  const interruptions: RecordingOutcome[] = [];
  const start = await startRecording(setup.environment, (outcome) => interruptions.push(outcome));
  if (start.kind !== 'started') throw new Error('expected a started recording');
  return { ...setup, recording: start.recording, interruptions, release };
}

// @FollowsBlueprint test-pure-unit
describe('startRecording', () => {
  it('answers unsupported where the browser cannot record', async () => {
    const unavailable = Promise.reject(new DOMException('no recorder', 'NotSupportedError'));
    expect(await startRecording(createEnvironment(unavailable).environment, vi.fn())).toEqual({
      kind: 'unsupported',
    });
  });

  it('answers denied when the member refuses the microphone', async () => {
    const refusal = Promise.reject(new DOMException('no', 'NotAllowedError'));
    expect(await startRecording(createEnvironment(refusal).environment, vi.fn())).toEqual({
      kind: 'denied',
    });
    const insecure = Promise.reject(new DOMException('no', 'SecurityError'));
    expect(await startRecording(createEnvironment(insecure).environment, vi.fn())).toEqual({
      kind: 'denied',
    });
  });

  it('answers unsupported for any other failure to open the microphone', async () => {
    const missing = Promise.reject(new DOMException('none', 'NotFoundError'));
    expect(await startRecording(createEnvironment(missing).environment, vi.fn())).toEqual({
      kind: 'unsupported',
    });
    const thrown = Promise.reject(new Error('boom'));
    expect(await startRecording(createEnvironment(thrown).environment, vi.fn())).toEqual({
      kind: 'unsupported',
    });
  });

  it('records the chunks until the member stops, then releases the microphone', async () => {
    const fake = createFakeRecorder();
    const started = await startWith(fake);
    expect(started.recording.startedAtEpochMilliseconds).toBe(STARTED_AT);

    fake.emitChunk(new Blob(['ab']));
    fake.emitChunk(new Blob(['c']));
    started.advance(RECORDED_MILLISECONDS);
    const outcome = await started.recording.stop();

    expect(outcome.kind).toBe('recorded');
    expect(fake.readStopCalls()).toBe(1);
    expect(outcome.contentType).toBe(WEBM);
    expect(outcome.durationMilliseconds).toBe(RECORDED_MILLISECONDS);
    expect(outcome.startedAtEpochMilliseconds).toBe(STARTED_AT);
    expect(outcome.audio.size).toBe(3);
    expect(outcome.audio.type).toBe(WEBM);
    expect(started.release).toHaveBeenCalledTimes(1);
    expect(started.interruptions).toEqual([]);
    expect(started.visibility.listeners.size).toBe(0);
  });

  it('settles a stop requested after the recorder already ended', async () => {
    const fake = createFakeRecorder();
    const started = await startWith(fake);
    fake.stopSilently();
    const outcome = await started.recording.stop();
    expect(outcome.kind).toBe('recorded');
    expect(fake.readStopCalls()).toBe(0);
    expect(started.release).toHaveBeenCalledTimes(1);
  });

  it('keeps what was recorded when the system stops the recorder', async () => {
    const fake = createFakeRecorder();
    const started = await startWith(fake);
    fake.emitChunk(new Blob(['abcd']));
    started.advance(RECORDED_MILLISECONDS);
    fake.stopBySystem();

    expect(started.interruptions).toHaveLength(1);
    expect(started.interruptions[0]?.kind).toBe('interrupted');
    expect(started.interruptions[0]?.audio.size).toBe(4);
    expect(started.interruptions[0]?.durationMilliseconds).toBe(RECORDED_MILLISECONDS);
    fake.stopBySystem();
    expect(started.interruptions).toHaveLength(1);
  });

  it('notices on return to the page that the recorder ended without saying so', async () => {
    const fake = createFakeRecorder();
    const started = await startWith(fake);

    started.visibility.change('hidden');
    expect(started.interruptions).toEqual([]);
    started.visibility.change('visible');
    expect(started.interruptions).toEqual([]);

    fake.stopSilently();
    started.visibility.change('hidden');
    expect(started.interruptions).toEqual([]);
    started.visibility.change('visible');
    expect(started.interruptions.map((outcome) => outcome.kind)).toEqual(['interrupted']);
  });
});

class FakeMediaRecorder extends EventTarget {
  static instances: FakeMediaRecorder[] = [];
  readonly mimeType = 'audio/mp4';
  state: 'inactive' | 'recording' = 'inactive';
  startedWith: number | null = null;
  readonly stream: unknown;
  constructor(stream: unknown) {
    super();
    this.stream = stream;
    FakeMediaRecorder.instances.push(this);
  }
  start(timeslice: number): void {
    this.state = 'recording';
    this.startedWith = timeslice;
  }
  stop(): void {
    this.state = 'inactive';
    this.dispatchEvent(new Event('stop'));
  }
}

class FakeBlobEvent extends Event {
  readonly data: Blob;
  constructor(data: Blob) {
    super('dataavailable');
    this.data = data;
  }
}

describe('readBrowserRecorderEnvironment', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeMediaRecorder.instances = [];
  });

  it('refuses to open the microphone where the browser has no recorder', async () => {
    const getUserMedia = vi.fn();
    vi.stubGlobal('MediaRecorder', undefined);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    await expect(readBrowserRecorderEnvironment().openMicrophone()).rejects.toMatchObject({
      name: 'NotSupportedError',
      message: 'recording is not available here',
    });
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('refuses to open the microphone where the page cannot reach media devices', async () => {
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('navigator', {});
    await expect(readBrowserRecorderEnvironment().openMicrophone()).rejects.toMatchObject({
      name: 'NotSupportedError',
    });
  });

  it('records through the browser recorder and stops every track on release', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] };
    const getUserMedia = vi.fn(() => Promise.resolve(stream));
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });

    const environment = readBrowserRecorderEnvironment();
    expect(environment.visibility).toBe(document);
    expect(environment.now()).toBeGreaterThan(0);
    const capture = await environment.openMicrophone();
    const chunks: Blob[] = [];
    const stops = vi.fn();
    capture.recorder.onChunk((chunk) => chunks.push(chunk));
    capture.recorder.onStop(stops);

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(capture.recorder.isInactive()).toBe(true);
    capture.recorder.start();
    const [browserRecorder] = FakeMediaRecorder.instances;
    expect(browserRecorder?.stream).toBe(stream);
    expect(browserRecorder?.startedWith).toBe(1_000);
    expect(capture.recorder.isInactive()).toBe(false);
    browserRecorder?.dispatchEvent(new FakeBlobEvent(new Blob(['x'])));
    capture.recorder.stop();

    expect(chunks).toHaveLength(1);
    expect(stops).toHaveBeenCalledTimes(1);
    expect(capture.recorder.readMimeType()).toBe('audio/mp4');
    capture.release();
    expect(track.stop).toHaveBeenCalledTimes(1);
  });
});

function createProbe(): AudioProbe {
  return { src: '', preload: '', duration: Number.NaN, onloadedmetadata: null, onerror: null };
}

describe('readAudioDurationMilliseconds', () => {
  it('reads the length from the file metadata and frees the address', async () => {
    const probe = createProbe();
    const revokeObjectUrl = vi.fn();
    const reading = readAudioDurationMilliseconds(new Blob(['a']), {
      createObjectUrl: () => 'blob:take',
      revokeObjectUrl,
      createAudio: () => probe,
    });
    expect(probe.src).toBe('blob:take');
    expect(probe.preload).toBe('metadata');
    Object.assign(probe, { duration: 3.5 });
    probe.onloadedmetadata?.(new Event('loadedmetadata'));

    expect(await reading).toBe(3_500);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:take');
  });

  it('answers NaN for a file the browser cannot read', async () => {
    const probe = createProbe();
    const revokeObjectUrl = vi.fn();
    const reading = readAudioDurationMilliseconds(new Blob(['a']), {
      createObjectUrl: () => 'blob:broken',
      revokeObjectUrl,
      createAudio: () => probe,
    });
    probe.onerror?.(new Event('error'));
    expect(await reading).toBeNaN();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:broken');
  });
});

describe('readBrowserAudioDurationEnvironment', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses object addresses and an audio element', () => {
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const environment = readBrowserAudioDurationEnvironment();
    const file = new Blob(['a']);

    expect(environment.createObjectUrl(file)).toBe('blob:x');
    expect(create).toHaveBeenCalledWith(file);
    environment.revokeObjectUrl('blob:x');
    expect(revoke).toHaveBeenCalledWith('blob:x');
    expect(environment.createAudio()).toBeInstanceOf(HTMLAudioElement);
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
