const NO_DATA: Readonly<Record<string, string>> = {};

// @FollowsBlueprint utils-pure-module
export function selectResponseData(
  requestType: 'Create' | 'Update' | 'Delete',
  generateValue: () => string,
): Readonly<Record<string, string>> {
  if (requestType === 'Delete') return NO_DATA;
  return { Value: generateValue() };
}
