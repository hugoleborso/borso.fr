import { JOIN_CODE_LENGTH } from '@domain/join-code.core';

export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

// @FollowsBlueprint utils-code-from-an-injected-draw
export function buildJoinCode(draw: () => number): string {
  let code = '';
  for (let position = 0; position < JOIN_CODE_LENGTH; position += 1) {
    const index = Math.floor(draw() * JOIN_CODE_ALPHABET.length);
    code += JOIN_CODE_ALPHABET.charAt(index);
  }
  return code;
}
