import type { Line, Opening, Variation } from './types';

// @FollowsBlueprint utils-pure-module
export function shortLineName(opening: Opening, variation: Variation, line: Line): string | null {
  const trimmed = stripPrefixes(line.name, opening.name, variation.name);
  return trimmed.length > 0 ? trimmed : null;
}

function stripPrefixes(lineName: string, openingName: string, variationName: string): string {
  let remainder = lineName;
  const openingPrefix = `${openingName}: `;
  if (remainder.startsWith(openingPrefix)) {
    remainder = remainder.slice(openingPrefix.length);
  } else if (remainder === openingName) {
    return '';
  }
  const variationPrefix = `${variationName}, `;
  if (remainder.startsWith(variationPrefix)) {
    remainder = remainder.slice(variationPrefix.length);
  } else if (remainder === variationName) {
    return '';
  }
  return remainder.trim();
}
