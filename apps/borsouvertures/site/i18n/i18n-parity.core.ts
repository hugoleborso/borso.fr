import {
  compareTranslationKeys,
  listTranslationKeys,
  type TranslationCatalogue,
} from './i18n.utils';

export interface CatalogueParityDifference {
  readonly missingInEnglish: readonly string[];
  readonly missingInFrench: readonly string[];
}

/**
 * The keys each catalogue is missing relative to the other. The sibling test
 * fails when either list is non-empty, so an English string added without its
 * French counterpart never merges.
 *
 * Both lists come out sorted, because {@link listTranslationKeys} sorts and a
 * `Set` then a `filter` both preserve the order they were given.
 */
export function diffCatalogues(
  english: TranslationCatalogue,
  french: TranslationCatalogue,
): CatalogueParityDifference {
  const englishKeys = new Set(listTranslationKeys(english));
  const frenchKeys = new Set(listTranslationKeys(french));
  return {
    missingInEnglish: [...frenchKeys].filter((key) => !englishKeys.has(key)),
    missingInFrench: [...englishKeys].filter((key) => !frenchKeys.has(key)),
  };
}

export function areCataloguesInParity(difference: CatalogueParityDifference): boolean {
  return difference.missingInEnglish.length === 0 && difference.missingInFrench.length === 0;
}

const KEY_PATH_SEPARATOR = '.';

function collectIdenticalValueKeys(
  english: TranslationCatalogue,
  french: TranslationCatalogue,
  prefix: string,
  identical: string[],
): void {
  for (const [segment, englishValue] of Object.entries(english)) {
    const path = prefix === '' ? segment : `${prefix}${KEY_PATH_SEPARATOR}${segment}`;
    const frenchValue = french[segment];
    if (typeof englishValue === 'string') {
      if (frenchValue === englishValue) identical.push(path);
    } else if (typeof frenchValue === 'object') {
      collectIdenticalValueKeys(englishValue, frenchValue, path, identical);
    }
  }
}

/**
 * Every key whose two catalogues carry the byte-identical string. Key parity
 * alone stays green when an English value is copied into `fr.json`, so the
 * sibling test asserts this list equals a named allowlist of the words that
 * genuinely read the same in both languages.
 *
 * @Blueprint i18n-parity-gate
 * @BlueprintName Catalogue Parity Gate
 * @BlueprintUsage Use in every application shipping two catalogues, to fail the build on a key or a translation that was never written.
 * @BlueprintDescription Pairs two pure comparisons over the raw catalogues. `diffCatalogues` reports the keys each side is missing by walking both into sorted dotted paths and filtering one set against the other. `listIdenticalValueKeys` then catches what key parity cannot see, an English string pasted into the French catalogue to silence the first check, by recursing both trees together and collecting every path whose two values are byte identical. Both take the catalogues as arguments and read no file, so the sibling test supplies small literals for the failure cases and the shipped catalogues for the real one.
 */
export function listIdenticalValueKeys(
  english: TranslationCatalogue,
  french: TranslationCatalogue,
): readonly string[] {
  const identical: string[] = [];
  collectIdenticalValueKeys(english, french, '', identical);
  return identical.sort(compareTranslationKeys);
}
