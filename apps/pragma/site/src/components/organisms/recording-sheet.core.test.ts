import { describe, expect, it } from 'vitest';
import type { TakeNotSavedReason } from '../../lib/take-queue.core';
import {
  buildTakeDownloadName,
  decidePhaseAfterQueueing,
  formatElapsedClock,
  type QueueingReport,
  selectPhaseAfterStart,
  selectRecordingSheetView,
} from './recording-sheet.core';

const DOWNLOAD = { url: 'blob:take', name: 'Take.webm' };

const QUIET_VIEW = {
  isOpen: true,
  isRecording: false,
  isBusy: false,
  messageKey: null,
  isAlert: false,
  elapsedSince: null,
  showsStop: false,
  offersUpload: false,
  download: null,
};

function viewOfNotSaved(reason: TakeNotSavedReason) {
  return selectRecordingSheetView({ kind: 'not-saved', reason, download: DOWNLOAD });
}

// @FollowsBlueprint test-pure-unit
describe('selectRecordingSheetView', () => {
  it('shows nothing while closed', () => {
    expect(selectRecordingSheetView({ kind: 'closed' })).toEqual({ ...QUIET_VIEW, isOpen: false });
  });

  it('says the microphone is starting, and cannot be dismissed meanwhile', () => {
    expect(selectRecordingSheetView({ kind: 'starting' })).toEqual({
      ...QUIET_VIEW,
      isBusy: true,
      messageKey: 'takes.recording.starting',
    });
  });

  it('shows the elapsed time and Stop while recording, with no message', () => {
    expect(
      selectRecordingSheetView({ kind: 'recording', startedAtEpochMilliseconds: 1_000 }),
    ).toEqual({
      ...QUIET_VIEW,
      isRecording: true,
      isBusy: true,
      elapsedSince: 1_000,
      showsStop: true,
    });
  });

  it('says it is saving', () => {
    expect(selectRecordingSheetView({ kind: 'saving' })).toEqual({
      ...QUIET_VIEW,
      isBusy: true,
      messageKey: 'takes.recording.saving',
    });
  });

  it('offers Upload when the microphone is refused or missing', () => {
    expect(selectRecordingSheetView({ kind: 'denied' })).toEqual({
      ...QUIET_VIEW,
      messageKey: 'takes.recording.denied',
      isAlert: true,
      offersUpload: true,
    });
    expect(selectRecordingSheetView({ kind: 'unsupported' })).toEqual({
      ...QUIET_VIEW,
      messageKey: 'takes.recording.unsupported',
      isAlert: true,
      offersUpload: true,
    });
  });

  it('says the recording was cut, with nothing more to do', () => {
    expect(selectRecordingSheetView({ kind: 'interrupted' })).toEqual({
      ...QUIET_VIEW,
      messageKey: 'takes.recording.interrupted',
      isAlert: true,
    });
  });

  it('offers a download for a take the device could not keep', () => {
    expect(viewOfNotSaved('quota-exceeded')).toEqual({
      ...QUIET_VIEW,
      messageKey: 'takes.recording.quotaExceeded',
      isAlert: true,
      download: DOWNLOAD,
    });
    expect(viewOfNotSaved('failed').messageKey).toBe('takes.recording.queueFailed');
    expect(viewOfNotSaved('unplayable').messageKey).toBe('takes.recording.unplayable');
  });
});

describe('selectPhaseAfterStart', () => {
  it('records from the moment the recorder started', () => {
    expect(
      selectPhaseAfterStart({ kind: 'started', recording: { startedAtEpochMilliseconds: 7 } }),
    ).toEqual({ kind: 'recording', startedAtEpochMilliseconds: 7 });
  });

  it('names a refused or missing microphone', () => {
    expect(selectPhaseAfterStart({ kind: 'denied' })).toEqual({ kind: 'denied' });
    expect(selectPhaseAfterStart({ kind: 'unsupported' })).toEqual({ kind: 'unsupported' });
  });
});

const REPORT: QueueingReport = {
  end: 'stopped',
  result: 'queued',
  songTitle: 'Seven Nation Army',
  contentType: 'audio/webm;codecs=opus',
  readDownloadUrl: () => 'blob:take',
};

describe('decidePhaseAfterQueueing', () => {
  it('closes the sheet once a stopped take is queued', () => {
    expect(decidePhaseAfterQueueing(REPORT)).toEqual({ kind: 'closed' });
  });

  it('keeps the sheet open to say an interrupted take was cut', () => {
    expect(decidePhaseAfterQueueing({ ...REPORT, end: 'interrupted' })).toEqual({
      kind: 'interrupted',
    });
  });

  it('offers the audio as a download when it could not be kept, however it ended', () => {
    expect(decidePhaseAfterQueueing({ ...REPORT, result: 'quota-exceeded' })).toEqual({
      kind: 'not-saved',
      reason: 'quota-exceeded',
      download: { url: 'blob:take', name: 'Seven Nation Army.webm' },
    });
    expect(
      decidePhaseAfterQueueing({ ...REPORT, end: 'interrupted', result: 'failed' }),
    ).toMatchObject({ kind: 'not-saved', reason: 'failed' });
  });
});

describe('formatElapsedClock', () => {
  it('pads minutes and seconds to two digits', () => {
    expect(formatElapsedClock(0)).toBe('00:00');
    expect(formatElapsedClock(137_999)).toBe('02:17');
    expect(formatElapsedClock(65 * 60_000)).toBe('65:00');
  });

  it('never shows a negative time when the clock is behind the start', () => {
    expect(formatElapsedClock(-5_000)).toBe('00:00');
  });
});

describe('buildTakeDownloadName', () => {
  it.each([
    ['audio/mp4', 'm4a'],
    ['audio/x-m4a', 'm4a'],
    ['audio/mpeg', 'mp3'],
    ['audio/webm;codecs=opus', 'webm'],
    ['audio/ogg', 'ogg'],
    ['audio/wav', 'wav'],
    ['audio/aac', 'aac'],
  ])('gives %s the extension %s', (contentType, extension) => {
    expect(buildTakeDownloadName('Take', contentType)).toBe(`Take.${extension}`);
  });

  it('falls back to a generic extension for a type it does not know', () => {
    expect(buildTakeDownloadName('Song', 'video/mp4')).toBe('Song.audio');
  });
});
