import type { Adr } from './types';

const ADR_FILENAME_PATTERN = /^(\d{4})-[a-z0-9-]+\.md$/;
const FIRST_ADR_NUMBER = 1;

export function parseAdrNumberFromFilename(filename: string): number | null {
  const match = ADR_FILENAME_PATTERN.exec(filename);
  const captured = match?.[1];
  if (captured === undefined) return null;
  return Number.parseInt(captured, 10);
}

export function nextAdrNumber(existingFilenames: ReadonlyArray<string>): number {
  let maxFound = 0;
  for (const filename of existingFilenames) {
    const parsed = parseAdrNumberFromFilename(filename);
    if (parsed !== null && parsed > maxFound) maxFound = parsed;
  }
  return maxFound === 0 ? FIRST_ADR_NUMBER : maxFound + 1;
}

export function findConflictingAdrs(
  newAdr: { slug: string; supersedes?: ReadonlyArray<number> },
  existing: ReadonlyArray<Adr>,
): Adr[] {
  const declaredSupersedes = new Set(newAdr.supersedes ?? []);
  const conflicts: Adr[] = [];
  for (const existingAdr of existing) {
    const sameSlug = existingAdr.slug === newAdr.slug;
    const stillAccepted = existingAdr.status === 'accepted';
    const declared = declaredSupersedes.has(existingAdr.number);
    if (sameSlug && stillAccepted && !declared) {
      conflicts.push(existingAdr);
    }
  }
  return conflicts;
}
