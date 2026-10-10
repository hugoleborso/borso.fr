import {
  type FrontMatterDocument,
  setFrontMatterValue,
  splitFrontMatter,
} from '@domain/front-matter.core';
import {
  type DraftStatusChange,
  isDraftReady,
  isDraftStatusChangeAllowed,
  READY_DRAFT_STATUS,
  SENT_DRAFT_STATUS,
} from '@domain/draft-status.core';
import { listWikilinkTargets } from '@domain/markdown-page.core';
import type { FileEdit } from '../content/content.service';

export interface DraftRecipient {
  readonly name: string;
  readonly page?: string;
}

export interface Draft {
  readonly slug: string;
  readonly channel: string;
  readonly recipients: DraftRecipient[];
  readonly subject?: string;
  readonly link?: string;
  readonly status: string;
  readonly createdOn: string;
  readonly source?: string;
  readonly proposal?: string;
  readonly sentOn?: string;
  readonly body: string;
}

export type DraftStatusOutcome =
  | { readonly kind: 'changed'; readonly draft: Draft }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'conflict' };

const DRAFTS_DIRECTORY = 'etat/brouillons';
const DRAFT_TYPE = 'brouillon';
const MARKDOWN_EXTENSION = '.md';
const PATH_SEPARATOR = '/';
const RECIPIENT_SEPARATOR = ',';
const WIKILINK_PATTERN = /\[\[[^\]]*\]\]/g;
const STATUS_KEY = 'statut';
const SENT_ON_KEY = 'envoye';
const STATUS_CHANGE_VERBS: Readonly<Record<DraftStatusChange, string>> = {
  envoye: 'envoyé',
  abandonne: 'abandonné',
  pret: 'remis prêt',
};

export function buildDraftPath(slug: string): string {
  return `${DRAFTS_DIRECTORY}/${slug}${MARKDOWN_EXTENSION}`;
}

export function readDraftSlug(path: string): string {
  return path.slice(path.lastIndexOf(PATH_SEPARATOR) + 1, -MARKDOWN_EXTENSION.length);
}

export function isDraftFile(path: string): boolean {
  return path.endsWith(MARKDOWN_EXTENSION);
}

function readRecipient(part: string): DraftRecipient | null {
  const page = listWikilinkTargets(part)[0];
  const writtenName = part.replaceAll(WIKILINK_PATTERN, '').trim();
  if (page === undefined) return writtenName === '' ? null : { name: writtenName };
  const name = writtenName === '' ? page.slice(page.lastIndexOf(PATH_SEPARATOR) + 1) : writtenName;
  return { name, page };
}

export function parseRecipients(raw: string): DraftRecipient[] {
  return raw
    .split(RECIPIENT_SEPARATOR)
    .map(readRecipient)
    .filter((recipient) => recipient !== null);
}

function readFilledValue(value: string | undefined): string | undefined {
  return value === '' ? undefined : value;
}

function readDraft(slug: string, document: FrontMatterDocument): Draft {
  const { frontMatter, body } = document;
  const subject = readFilledValue(frontMatter.sujet);
  const link = readFilledValue(frontMatter.lien);
  const source = readFilledValue(frontMatter.src);
  const proposal = readFilledValue(frontMatter.proposition);
  const sentOn = readFilledValue(frontMatter.envoye);
  return {
    slug,
    channel: frontMatter.canal ?? '',
    // Stryker disable next-line StringLiteral: equivalent mutant, any fallback without a name or a wikilink yields no recipient exactly like the empty string.
    recipients: parseRecipients(frontMatter.destinataire ?? ''),
    ...(subject === undefined ? {} : { subject }),
    ...(link === undefined ? {} : { link }),
    status: frontMatter.statut ?? '',
    createdOn: frontMatter.cree ?? '',
    ...(source === undefined ? {} : { source }),
    ...(proposal === undefined ? {} : { proposal }),
    ...(sentOn === undefined ? {} : { sentOn }),
    body: body.trim(),
  };
}

// @FollowsBlueprint core-parse-untrusted
export function parseDraft(slug: string, markdown: string): Draft | null {
  const document = splitFrontMatter(markdown);
  return document.frontMatter.type === DRAFT_TYPE ? readDraft(slug, document) : null;
}

// @FollowsBlueprint core-projection
export function selectDrafts(files: ReadonlyMap<string, string>): Draft[] {
  return [...files]
    .map(([path, markdown]) => parseDraft(readDraftSlug(path), markdown))
    .filter((draft) => draft !== null)
    .toSorted(
      (left, right) =>
        right.createdOn.localeCompare(left.createdOn) || right.slug.localeCompare(left.slug),
    );
}

export function countReadyDrafts(drafts: readonly Draft[]): number {
  return drafts.filter((draft) => isDraftReady(draft.status)).length;
}

// @FollowsBlueprint core-serializer
export function applyDraftStatus(
  markdown: string,
  target: DraftStatusChange,
  today: string,
): string {
  const withStatus = setFrontMatterValue(markdown, STATUS_KEY, target);
  if (target === SENT_DRAFT_STATUS) return setFrontMatterValue(withStatus, SENT_ON_KEY, today);
  const sentOn = readFilledValue(splitFrontMatter(withStatus).frontMatter[SENT_ON_KEY]);
  const isSentOnToClear = target === READY_DRAFT_STATUS && sentOn !== undefined;
  return isSentOnToClear ? setFrontMatterValue(withStatus, SENT_ON_KEY, '') : withStatus;
}

export function changeDraftStatusFile(
  slug: string,
  current: string | null,
  change: { readonly target: DraftStatusChange; readonly today: string },
): FileEdit<DraftStatusOutcome> {
  if (current === null) return { content: null, outcome: { kind: 'not-found' } };
  const draft = parseDraft(slug, current);
  if (draft === null) return { content: null, outcome: { kind: 'not-found' } };
  if (!isDraftStatusChangeAllowed(draft.status, change.target)) {
    return { content: null, outcome: { kind: 'conflict' } };
  }
  const content = applyDraftStatus(current, change.target, change.today);
  return {
    content,
    commitMessage: `pwa : brouillon ${STATUS_CHANGE_VERBS[change.target]} ${slug}`,
    outcome: { kind: 'changed', draft: readDraft(slug, splitFrontMatter(content)) },
  };
}
