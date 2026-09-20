/** @Feature setlists */

import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

export const CAPO_MIN = 0;
export const CAPO_MAX = 11;
export const KEY_OVERRIDE_MAX = 16;
export const NOTES_MAX = 1_024;

export const setlistEntryFormSchema = z.object({
  keyOverride: z.string().max(KEY_OVERRIDE_MAX),
  capo: z.string().regex(/^(\d+)?$/u),
  notes: z.string().max(NOTES_MAX),
});

export type SetlistEntryFormValues = z.infer<typeof setlistEntryFormSchema>;

export function useSetlistEntryForm(defaultValues: SetlistEntryFormValues) {
  return useForm({
    defaultValues,
    validators: { onChange: setlistEntryFormSchema },
  });
}

export type SetlistEntryForm = ReturnType<typeof useSetlistEntryForm>;
