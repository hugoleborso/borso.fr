import type { ValueByFlag } from './componentTable.types';

interface MoveSoundTone {
  startHertz: number;
  endHertz: number;
  durationSeconds: number;
}

const PEAK_GAIN = 0.35;
const SILENT_GAIN = 0.0001;

// @FollowsBlueprint component-lookup-table
const TONE_BY_CAPTURE: ValueByFlag<MoveSoundTone> = {
  false: { startHertz: 520, endHertz: 180, durationSeconds: 0.07 },
  true: { startHertz: 360, endHertz: 90, durationSeconds: 0.11 },
};

const audio: { context: AudioContext | null } = { context: null };

function ignoreMissingAudio(): void {
  return undefined;
}

function playTone(tone: MoveSoundTone): void {
  try {
    audio.context ??= new AudioContext();
    const { context } = audio;
    const startTime = context.currentTime;
    const endTime = startTime + tone.durationSeconds;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(tone.startHertz, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(tone.endHertz, endTime);
    gain.gain.setValueAtTime(PEAK_GAIN, startTime);
    gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, endTime);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(endTime);
  } catch {
    ignoreMissingAudio();
  }
}

// @FollowsBlueprint browser-edge-module
export function playMoveSound(isCapture: boolean): void {
  playTone(TONE_BY_CAPTURE[`${isCapture}`]);
}
