// @FollowsBlueprint utils-pure-module
export function isSubmitDisabled(
  canSubmit: boolean | undefined,
  isSubmitting: boolean | undefined,
): boolean {
  return canSubmit !== true || isSubmitting === true;
}
