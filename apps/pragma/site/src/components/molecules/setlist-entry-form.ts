/**
 * The form a setlist row runs on.
 *
 * Split from `SetlistEntryDetailsFields` so that file exports a component and
 * nothing else, which is what keeps fast refresh working. The row owns the
 * instance because it drives the energy field from it too.
 *
 * The form is never submitted — see `SetlistEntryRow` — so there is no
 * `onSubmit` here either. It exists for field state and Zod validation.
 */

import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

export const ENERGY_MIN = 1;
export const ENERGY_MAX = 10;
export const CAPO_MIN = 0;
export const CAPO_MAX = 11;
export const KEY_OVERRIDE_MAX = 16;
export const NOTES_MAX = 1_024;

export const setlistEntryFormSchema = z.object({
  keyOverride: z.string().max(KEY_OVERRIDE_MAX),
  capo: z.string().regex(/^(\d+)?$/u),
  notes: z.string().max(NOTES_MAX),
  energy: z.number().int().min(ENERGY_MIN).max(ENERGY_MAX),
});

export type SetlistEntryFormValues = z.infer<typeof setlistEntryFormSchema>;

export function useSetlistEntryForm(defaultValues: SetlistEntryFormValues) {
  return useForm({
    defaultValues,
    validators: { onChange: setlistEntryFormSchema },
  });
}

export type SetlistEntryForm = ReturnType<typeof useSetlistEntryForm>;
