/** @Feature songs */

import { z } from 'zod';
import { songStatuses, type SongStatus } from '../../routes/catalog/song-draft.core';

export const TONALITY_MAX = 16;
export const BASE_ENERGY_MIN = 1;
export const BASE_ENERGY_MAX = 10;

export const songDefaultsFormSchema = z.object({
  status: z.enum(songStatuses),
  tonalityStart: z.string().max(TONALITY_MAX),
  tonalityEnd: z.string().max(TONALITY_MAX),
  baseEnergy: z.string().regex(/^(\d+)?$/u),
});

export type SongDefaultsFormValues = z.infer<typeof songDefaultsFormSchema>;

export interface SongDefaults {
  readonly status: SongStatus;
  readonly tonalityStart: string | null;
  readonly tonalityEnd: string | null;
  readonly baseEnergy: number | null;
}

export interface SongDefaultsPatch {
  readonly status?: SongStatus;
  readonly tonalityStart?: string | null;
  readonly tonalityEnd?: string | null;
  readonly baseEnergy?: number | null;
  readonly defaultLineup?: Record<string, string[]>;
}

// @FollowsBlueprint core-form-schema
export function songDefaultsToFormValues(defaults: SongDefaults): SongDefaultsFormValues {
  return {
    status: defaults.status,
    tonalityStart: defaults.tonalityStart ?? '',
    tonalityEnd: defaults.tonalityEnd ?? '',
    baseEnergy: defaults.baseEnergy === null ? '' : String(defaults.baseEnergy),
  };
}

function trimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function boundedEnergyOrNull(value: string): number | null {
  const energy = Number(value);
  if (!Number.isInteger(energy)) return null;
  if (energy < BASE_ENERGY_MIN || energy > BASE_ENERGY_MAX) return null;
  return energy;
}

export function songDefaultsFromFormValues(values: SongDefaultsFormValues): SongDefaults {
  return {
    status: values.status,
    tonalityStart: trimmedOrNull(values.tonalityStart),
    tonalityEnd: trimmedOrNull(values.tonalityEnd),
    baseEnergy: boundedEnergyOrNull(values.baseEnergy),
  };
}
