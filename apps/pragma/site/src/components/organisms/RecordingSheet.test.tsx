import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { createIsolatedQueryClient } from '../../lib/queries/queries.test-utils';
import type { RecordingOutcome, RecordingStart } from '../../lib/recorder.core';
import { RecordingSheet } from './RecordingSheet';

const recorder = vi.hoisted(() => ({
  startRecording: vi.fn(),
  readBrowserRecorderEnvironment: vi.fn(() => ({})),
}));
const queue = vi.hoisted(() => ({ queueTake: vi.fn() }));

vi.mock('../../lib/recorder.adapter', () => recorder);
vi.mock('../../lib/take-queue.setup', () => queue);

function stubShowModal(this: HTMLDialogElement): void {
  this.setAttribute('open', '');
}

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value: stubShowModal,
});

const STARTED_AT = Date.parse('2026-10-23T18:00:00.000Z');
const RECORDED: RecordingOutcome = {
  kind: 'recorded',
  audio: new Blob(['abc'], { type: 'audio/webm' }),
  contentType: 'audio/webm;codecs=opus',
  startedAtEpochMilliseconds: STARTED_AT,
  durationMilliseconds: 137_400,
};

function startedWith(outcome: RecordingOutcome): RecordingStart {
  return {
    kind: 'started',
    recording: { startedAtEpochMilliseconds: STARTED_AT, stop: () => Promise.resolve(outcome) },
  };
}

function renderSheet(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <RecordingSheet songId="song-1" songTitle="Seven Nation Army" sessionId="session-1" />
    </QueryClientProvider>,
  );
}

// @FollowsBlueprint test-component-render
describe('RecordingSheet', () => {
  beforeEach(() => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:take'), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('records, stops, queues the take for its song and session, and closes', async () => {
    const user = userEvent.setup();
    recorder.startRecording.mockResolvedValue(startedWith(RECORDED));
    queue.queueTake.mockResolvedValue('queued');
    renderSheet();

    await user.click(screen.getByRole('button', { name: 'Record a take of Seven Nation Army' }));
    expect(await screen.findByText('screen kept awake')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Stop' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
    });
    expect(queue.queueTake).toHaveBeenCalledWith(
      {
        songId: 'song-1',
        sessionId: 'session-1',
        recordedAt: new Date(STARTED_AT),
        durationSeconds: 137,
        rawContentType: 'audio/webm;codecs=opus',
        source: 'live',
      },
      RECORDED.audio,
    );
  });

  it('says the microphone is refused and offers Upload instead', async () => {
    const user = userEvent.setup();
    recorder.startRecording.mockResolvedValue({ kind: 'denied' });
    renderSheet();

    await user.click(screen.getByRole('button', { name: 'Record a take of Seven Nation Army' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'The microphone is not allowed',
    );
    await user.click(screen.getByRole('button', { name: 'Upload' }));
    expect(await screen.findByText('Upload a take of Seven Nation Army')).toBeTruthy();
  });

  it('keeps what was recorded when the phone locks, and says it was cut', async () => {
    const user = userEvent.setup();
    const interruptHandlers: ((outcome: RecordingOutcome) => void)[] = [];
    recorder.startRecording.mockImplementation(
      (_environment: unknown, onInterrupted: (outcome: RecordingOutcome) => void) => {
        interruptHandlers.push(onInterrupted);
        return Promise.resolve(startedWith(RECORDED));
      },
    );
    queue.queueTake.mockResolvedValue('queued');
    renderSheet();

    await user.click(screen.getByRole('button', { name: 'Record a take of Seven Nation Army' }));
    await screen.findByText('screen kept awake');
    for (const interrupt of interruptHandlers) interrupt({ ...RECORDED, kind: 'interrupted' });

    expect((await screen.findByRole('alert')).textContent).toContain('The recording was cut');
    expect(queue.queueTake).toHaveBeenCalledTimes(1);
  });

  it('says nothing was recorded when Stop comes before any audio, and offers no download', async () => {
    const user = userEvent.setup();
    recorder.startRecording.mockResolvedValue(startedWith({ ...RECORDED, audio: new Blob([]) }));
    queue.queueTake.mockResolvedValue('empty');
    renderSheet();

    await user.click(screen.getByRole('button', { name: 'Record a take of Seven Nation Army' }));
    await user.click(await screen.findByRole('button', { name: 'Stop' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Nothing was recorded, so no take was saved.',
    );
    expect(screen.queryByRole('link', { name: 'Download' })).toBeNull();
  });

  it('offers the take as a download when the device is full', async () => {
    const user = userEvent.setup();
    recorder.startRecording.mockResolvedValue(startedWith(RECORDED));
    queue.queueTake.mockResolvedValue('quota-exceeded');
    renderSheet();

    await user.click(screen.getByRole('button', { name: 'Record a take of Seven Nation Army' }));
    await user.click(await screen.findByRole('button', { name: 'Stop' }));

    const download = await screen.findByRole('link', { name: 'Download' });
    expect(download.getAttribute('href')).toBe('blob:take');
    expect(download.getAttribute('download')).toBe('Seven Nation Army.webm');
    expect(screen.getByRole('alert').textContent).toContain('storage is full');
  });
});
