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
