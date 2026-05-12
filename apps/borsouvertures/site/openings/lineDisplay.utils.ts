import type { Line, Opening, Variation } from './types';

/**
 * The Lichess `chess-openings` dataset stores each line's `name` as the FULL
 * PGN title — `"Italian Game: Classical Variation, Greco's Attack"` — which
 * starts with the opening name and (when colon-delimited) the variation name.
 * Showing the full title in a status panel that already shows
 * `Opening` / `Variation` separately is redundant.
 *
 * `shortLineName` returns the line's distinctive suffix only:
 *
 *   - input: `("Italian Game", "Classical Variation", "Italian Game: Classical Variation, Greco's Attack")`
 *     → `"Greco's Attack"`
 *   - input: `("Italian Game", "Main Line", "Italian Game")`
 *     → `null` (the line is the bare opening with no further specifier;
 *       the caller decides whether to show "Mainline" or just dash it out)
 */
export function shortLineName(opening: Opening, variation: Variation, line: Line): string | null {
  const trimmed = stripPrefixes(line.name, opening.name, variation.name);
  return trimmed.length > 0 ? trimmed : null;
}

function stripPrefixes(lineName: string, openingName: string, variationName: string): string {
  let remainder = lineName;
  // Drop the opening prefix + colon (e.g. "Italian Game: ")
  const openingPrefix = `${openingName}: `;
  if (remainder.startsWith(openingPrefix)) {
    remainder = remainder.slice(openingPrefix.length);
  } else if (remainder === openingName) {
    return '';
  }
  // Drop the variation prefix + comma (e.g. "Classical Variation, ")
  const variationPrefix = `${variationName}, `;
  if (remainder.startsWith(variationPrefix)) {
    remainder = remainder.slice(variationPrefix.length);
  } else if (remainder === variationName) {
    return '';
  }
  return remainder.trim();
}
