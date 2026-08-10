/**
 * Shared submit-button state for every `@tanstack/react-form` form.
 *
 * `form.Subscribe` hands its selector result back as an array, so each
 * flag arrives as `boolean | undefined`. An absent flag is treated as
 * "not blocking", and only an explicit value blocks the button.
 */

// @FollowsBlueprint utils-pure-module
export function isSubmitDisabled(
  canSubmit: boolean | undefined,
  isSubmitting: boolean | undefined,
): boolean {
  return canSubmit !== true || isSubmitting === true;
}

export function isSubmitDisabledWhilePending(
  canSubmit: boolean | undefined,
  isSubmitting: boolean | undefined,
  isMutationPending: boolean,
): boolean {
  return isSubmitDisabled(canSubmit, isSubmitting) || isMutationPending;
}
