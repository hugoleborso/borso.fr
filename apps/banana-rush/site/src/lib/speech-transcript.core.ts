type Alternative = { readonly transcript: string } | undefined;
type SpokenResult = Record<number, Alternative> | undefined;

export interface TranscriptSource {
  readonly results: Record<number, SpokenResult> & { readonly length: number };
}

const BEST_ALTERNATIVE = 0;
const NOTHING_SPOKEN = 0;

function transcriptAt(source: TranscriptSource, index: number): string {
  const spokenResult: SpokenResult = source.results[index];
  if (spokenResult === undefined) return '';
  const alternative: Alternative = spokenResult[BEST_ALTERNATIVE];
  if (alternative === undefined) return '';
  return alternative.transcript.trim();
}

/**
 * @Blueprint core-reading-an-array-like-vendor-payload
 * @BlueprintName Core Reading An Array Like Vendor Payload
 * @BlueprintUsage Use where a browser hands back a collection that carries a length and is not an array.
 * @BlueprintDescription Builds a real array from the reported length rather than spreading or mapping the vendor object, because the collection a speech recogniser returns is array like and the array methods are not on it. Every hop is read as a step of its own and checked, since the shape belongs to the vendor and not to this application, and a gap yields nothing rather than an exception inside an event handler where nobody would catch it. Keeping the walk pure and here is what lets the whole shape, gaps included, be a test rather than something discovered on a real phone.
 */
export function readTranscript(source: TranscriptSource): string {
  return Array.from({ length: source.results.length }, (_unused, index) =>
    transcriptAt(source, index),
  )
    .flatMap((utterance) => (utterance.length === NOTHING_SPOKEN ? [] : [utterance]))
    .join(' ');
}
