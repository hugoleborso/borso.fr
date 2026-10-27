export const TAKE_CONTENT_TYPES = [
  'audio/mp4',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/aac',
] as const;

export type TakeContentType = (typeof TAKE_CONTENT_TYPES)[number];

const TAKE_FILE_EXTENSIONS = {
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/aac': 'aac',
} as const satisfies Record<TakeContentType, string>;

export type TakeFileExtension = (typeof TAKE_FILE_EXTENSIONS)[TakeContentType];

// @FollowsBlueprint core-lookup-table
export function takeFileExtensionOf(contentType: TakeContentType): TakeFileExtension {
  return TAKE_FILE_EXTENSIONS[contentType];
}

export const TAKE_SOURCES = ['live', 'upload'] as const;

export type TakeSource = (typeof TAKE_SOURCES)[number];

const BYTES_PER_KIBIBYTE = 1_024;
const BYTES_PER_MEBIBYTE = BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE;
const SECONDS_PER_HOUR = 3_600;
const TAKE_DURATION_MAX_HOURS = 4;

export const TAKE_MAX_MEBIBYTES = 50;
export const TAKE_MAX_BYTES = TAKE_MAX_MEBIBYTES * BYTES_PER_MEBIBYTE;
export const TAKE_DURATION_MAX_SECONDS = TAKE_DURATION_MAX_HOURS * SECONDS_PER_HOUR;
export const TAKE_COMMENT_MAX_LENGTH = 4_096;

const MEDIA_TYPE_PARAMETER_SEPARATOR = ';';

const CONTENT_TYPE_ALIASES: Readonly<Record<string, TakeContentType>> = {
  'audio/mp3': 'audio/mpeg',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/vnd.wave': 'audio/wav',
};

function isTakeContentType(candidate: string): candidate is TakeContentType {
  return TAKE_CONTENT_TYPES.some((contentType) => contentType === candidate);
}

// @FollowsBlueprint core-decision
export function normalizeTakeContentType(rawContentType: string): TakeContentType | null {
  const separatorIndex = rawContentType.indexOf(MEDIA_TYPE_PARAMETER_SEPARATOR);
  const mediaType =
    separatorIndex === -1 ? rawContentType : rawContentType.slice(0, separatorIndex);
  const essence = mediaType.trim().toLowerCase();
  if (isTakeContentType(essence)) return essence;
  return CONTENT_TYPE_ALIASES[essence] ?? null;
}

export interface TakeFileCandidate {
  readonly type: string;
  readonly size: number;
}

export type TakeFileVerdict =
  | { readonly kind: 'ok'; readonly contentType: TakeContentType }
  | { readonly kind: 'empty' }
  | { readonly kind: 'not-audio' }
  | { readonly kind: 'too-large'; readonly maxMebibytes: number };

// @FollowsBlueprint core-decision
export function validateTakeFile(file: TakeFileCandidate): TakeFileVerdict {
  const contentType = normalizeTakeContentType(file.type);
  if (contentType === null) return { kind: 'not-audio' };
  if (file.size === 0) return { kind: 'empty' };
  if (file.size > TAKE_MAX_BYTES) return { kind: 'too-large', maxMebibytes: TAKE_MAX_MEBIBYTES };
  return { kind: 'ok', contentType };
}
