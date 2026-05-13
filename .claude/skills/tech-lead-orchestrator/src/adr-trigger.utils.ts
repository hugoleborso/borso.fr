export type ArchChoice = {
  hasMultipleSeriousAlternatives: boolean;
  hasCrossCuttingImpact: boolean;
  divergesFromConvention: boolean;
  looksStandardOrExistsElsewhere: boolean;
};

type AdrTriggerName =
  | 'multiple-alternatives'
  | 'cross-cutting'
  | 'diverges-from-convention'
  | 'looks-standard';

export function needsAdr(candidate: ArchChoice): boolean {
  return triggersFor(candidate).length > 0;
}

export function triggersFor(candidate: ArchChoice): AdrTriggerName[] {
  const triggers: AdrTriggerName[] = [];
  if (candidate.hasMultipleSeriousAlternatives) triggers.push('multiple-alternatives');
  if (candidate.hasCrossCuttingImpact) triggers.push('cross-cutting');
  if (candidate.divergesFromConvention) triggers.push('diverges-from-convention');
  if (candidate.looksStandardOrExistsElsewhere) triggers.push('looks-standard');
  return triggers;
}
