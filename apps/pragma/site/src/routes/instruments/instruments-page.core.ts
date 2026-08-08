/**
 * What deleting an instrument does to the edit form beside the list.
 *
 * The form is bound to whichever row is selected, so deleting that row has to
 * empty it, while deleting any other row must leave a half-typed edit alone.
 */

export type InstrumentDeletionEffect = 'keep-form' | 'clear-form';

export function selectInstrumentDeletionEffect(
  selectedInstrumentId: string | null,
  deletedInstrumentId: string,
): InstrumentDeletionEffect {
  return selectedInstrumentId === deletedInstrumentId ? 'clear-form' : 'keep-form';
}
