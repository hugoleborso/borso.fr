import { JOIN_CODE_LENGTH } from './games.schema';

export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * @Blueprint utils-code-from-an-injected-draw
 * @BlueprintName Utils Code From An Injected Draw
 * @BlueprintUsage Use for a short human readable identifier that has to be random in production and fixed in a test.
 * @BlueprintDescription Takes the source of randomness as an argument rather than calling `Math.random` inside, which is what lets the file keep the `.utils.ts` suffix and its full coverage gate while still producing a different code on every real call. The alphabet leaves out the characters a person reads back wrongly over a table, so a code never has to be spelled twice. `normalizeJoinCode` is the reverse direction and is deliberately generous, because a player types the code by hand and the case and the spaces are not part of it.
 */
export function buildJoinCode(draw: () => number): string {
  let code = '';
  for (let position = 0; position < JOIN_CODE_LENGTH; position += 1) {
    const index = Math.floor(draw() * JOIN_CODE_ALPHABET.length);
    code += JOIN_CODE_ALPHABET.charAt(index);
  }
  return code;
}

export function normalizeJoinCode(raw: string): string {
  return raw.toUpperCase().replaceAll(/[^A-Z0-9]/gu, '');
}
