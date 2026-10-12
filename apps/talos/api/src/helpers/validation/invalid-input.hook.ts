import { TalosError } from '../errors/talos-error.types';

export function rejectInvalidInput(validation: { readonly success: boolean }): void {
  if (!validation.success) throw new TalosError('invalid-input');
}
