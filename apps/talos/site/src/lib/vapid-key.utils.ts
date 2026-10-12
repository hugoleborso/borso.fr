// @FollowsBlueprint utils-pure-module
export function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}
