const NOT_CONCERT_READY_LABEL_KEY = {
  idea: 'audience.notConcertReadyIdea',
  wip: 'audience.notConcertReadyWip',
  rehearsed: 'audience.notConcertReadyRehearsed',
} as const;

type NotConcertReadyStatus = keyof typeof NOT_CONCERT_READY_LABEL_KEY;

export type NotConcertReadyLabelKey = (typeof NOT_CONCERT_READY_LABEL_KEY)[NotConcertReadyStatus];

function isNotConcertReady(status: string): status is NotConcertReadyStatus {
  return status in NOT_CONCERT_READY_LABEL_KEY;
}

/**
 * @Blueprint core-marker-read-off-an-existing-field
 * @BlueprintName Marker Read Off An Existing Field
 * @BlueprintUsage Use when a badge on a row states something a field the record already carries implies, rather than something a second flag records.
 * @BlueprintDescription Derives the label from the status itself, so the badge cannot disagree with the record and no write has to keep a second field in step. The table of statuses that need a marker is the whole rule: naming the one status that needs none would be a second place to be wrong, and it is already absent from the table. Answers nothing rather than a fallback label, which is what lets the caller render no badge at all instead of an empty one. Two components share this one function, so the two surfaces showing the same row cannot mark it differently.
 */
export function selectNotConcertReadyLabelKey(status: string): NotConcertReadyLabelKey | null {
  if (!isNotConcertReady(status)) return null;
  return NOT_CONCERT_READY_LABEL_KEY[status];
}
