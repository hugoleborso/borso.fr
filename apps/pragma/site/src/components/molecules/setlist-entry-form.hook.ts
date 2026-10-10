/** @Feature setlists */

import { KEY_OVERRIDE_MAX_LENGTH, SETLIST_ENTRY_NOTES_MAX_LENGTH } from '@domain/input-limits.core';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

export const setlistEntryFormSchema = z.object({
  keyOverride: z.string().max(KEY_OVERRIDE_MAX_LENGTH),
  capo: z.string().regex(/^(\d+)?$/u),
  notes: z.string().max(SETLIST_ENTRY_NOTES_MAX_LENGTH),
});

export type SetlistEntryFormValues = z.infer<typeof setlistEntryFormSchema>;

export function useSetlistEntryForm(defaultValues: SetlistEntryFormValues) {
  return useForm({
    defaultValues,
    validators: { onChange: setlistEntryFormSchema },
  });
}

export type SetlistEntryForm = ReturnType<typeof useSetlistEntryForm>;
