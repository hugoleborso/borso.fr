import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { createIsolatedQueryClient } from '../../lib/queries/queries.test-utils';
import { toDateTimeLocalValue } from './take-upload-form.core';
import { TakeUploadForm } from './TakeUploadForm';
import { stubSheetDialog } from '../molecules/sheet.test-utils';

const NEAR_PRACTICE = { id: 'practice-near', kind: 'practice', date: '2026-10-18T19:00:00.000Z' };
const FAR_PRACTICE = { id: 'practice-far', kind: 'practice', date: '2026-10-11T19:00:00.000Z' };
const GIG_THAT_NIGHT = { id: 'gig-that-night', kind: 'gig', date: '2026-10-18T21:00:00.000Z' };
const FILE_LAST_MODIFIED = Date.parse('2026-10-18T21:30:00.000Z');
const DURATION_MILLISECONDS = 232_400;

const sessions = vi.hoisted(() => ({ useSessionsList: vi.fn() }));
const recorder = vi.hoisted(() => ({
  readAudioDurationMilliseconds: vi.fn(),
  readBrowserAudioDurationEnvironment: vi.fn(() => ({})),
}));
const queue = vi.hoisted(() => ({ queueTake: vi.fn() }));

vi.mock('../../lib/queries/sessions.queries', () => sessions);
vi.mock('../../lib/recorder.adapter', () => recorder);
vi.mock('../../lib/take-queue.setup', () => queue);

stubSheetDialog();

function buildRecordedFile(): File {
  return new File(['take'], 'practice.webm', {
    type: 'audio/webm',
    lastModified: FILE_LAST_MODIFIED,
  });
}

function renderForm(presetSessionId: string | null, onClose: () => void = vi.fn()): void {
  sessions.useSessionsList.mockReturnValue({
    data: { sessions: [FAR_PRACTICE, GIG_THAT_NIGHT, NEAR_PRACTICE] },
  });
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <TakeUploadForm
        songId="song-1"
        songTitle="Seven Nation Army"
        presetSessionId={presetSessionId}
        onClose={onClose}
      />
    </QueryClientProvider>,
  );
}

function readFieldValue(label: string): string {
  const field = screen.getByLabelText(label);
  if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLSelectElement)) {
    throw new TypeError(`${label} is not a form field`);
  }
  return field.value;
}

// @FollowsBlueprint test-component-render
describe('TakeUploadForm', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('proposes the date of the file and the practice nearest to it', async () => {
    const user = userEvent.setup();
    renderForm(null);

    await user.upload(screen.getByLabelText('Audio file'), buildRecordedFile());

    expect(readFieldValue('Recorded at')).toBe(toDateTimeLocalValue(new Date(FILE_LAST_MODIFIED)));
    expect(readFieldValue('Session')).toBe(NEAR_PRACTICE.id);
  });

  it('keeps the session it was opened from, and still proposes the date of the file', async () => {
    const user = userEvent.setup();
    renderForm(FAR_PRACTICE.id);

    await user.upload(screen.getByLabelText('Audio file'), buildRecordedFile());

    expect(readFieldValue('Recorded at')).toBe(toDateTimeLocalValue(new Date(FILE_LAST_MODIFIED)));
    expect(readFieldValue('Session')).toBe(FAR_PRACTICE.id);
  });

  it('queues the file with the proposed date and session, and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    recorder.readAudioDurationMilliseconds.mockResolvedValue(DURATION_MILLISECONDS);
    queue.queueTake.mockResolvedValue('queued');
    renderForm(null, onClose);
    const file = buildRecordedFile();

    await user.upload(screen.getByLabelText('Audio file'), file);
    await user.click(screen.getByRole('button', { name: 'Save', hidden: true }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(queue.queueTake).toHaveBeenCalledWith(
      {
        songId: 'song-1',
        sessionId: NEAR_PRACTICE.id,
        recordedAt: new Date(toDateTimeLocalValue(new Date(FILE_LAST_MODIFIED))),
        durationSeconds: 232,
        rawContentType: 'audio/webm',
        source: 'upload',
        isFromPracticeMode: false,
      },
      file,
    );
  });
});
