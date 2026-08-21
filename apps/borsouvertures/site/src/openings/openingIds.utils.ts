const APOSTROPHES = /['’]/g;
const NON_SLUG_RUNS = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-+|-+$/g;

const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const SIXTY_FOUR_BIT_MASK = 0xffffffffffffffffn;
const FINGERPRINT_RADIX = 36;
const MOVE_SEPARATOR = ' ';

// @FollowsBlueprint utils-pure-module
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(APOSTROPHES, '')
    .replace(NON_SLUG_RUNS, '-')
    .replace(EDGE_HYPHENS, '');
}

function fingerprint(value: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash ^ BigInt(value.charCodeAt(index))) * FNV_PRIME) & SIXTY_FOUR_BIT_MASK;
  }
  return hash.toString(FINGERPRINT_RADIX);
}

export function buildLineId(name: string, movesUci: readonly string[]): string {
  return `${toSlug(name)}-${fingerprint(movesUci.join(MOVE_SEPARATOR))}`;
}
