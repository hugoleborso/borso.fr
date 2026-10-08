import type { ParseKeys } from 'i18next';
import type { ChipTone } from '../atoms/chip.variants';
import type { IconName } from '../atoms/Icon';

export interface DraftShape {
  readonly slug: string;
  readonly status: string;
}

export interface PartitionedDrafts<Draft extends DraftShape> {
  readonly ready: Draft[];
  readonly settled: Draft[];
}

interface ChannelAppearance {
  readonly icon: IconName;
  readonly labelKey: ParseKeys;
}

interface StatusAppearance {
  readonly labelKey: ParseKeys;
  readonly tone: ChipTone;
}

const READY_STATUS = 'pret';
const WHITESPACE_PATTERN = /\s+/g;

const CHANNEL_APPEARANCES: Readonly<Record<string, ChannelAppearance>> = {
  gmail: { icon: 'mail', labelKey: 'drafts.channel.gmail' },
  slack: { icon: 'hash', labelKey: 'drafts.channel.slack' },
  linkedin: { icon: 'briefcase', labelKey: 'drafts.channel.linkedin' },
  whatsapp: { icon: 'phone', labelKey: 'drafts.channel.whatsapp' },
  imessage: { icon: 'smartphone', labelKey: 'drafts.channel.imessage' },
};
const OTHER_CHANNEL: ChannelAppearance = { icon: 'send', labelKey: 'drafts.channel.other' };

const STATUS_APPEARANCES: Readonly<Record<string, StatusAppearance>> = {
  pret: { labelKey: 'drafts.status.ready', tone: 'bronze' },
  envoye: { labelKey: 'drafts.status.sent', tone: 'success' },
  abandonne: { labelKey: 'drafts.status.abandoned', tone: 'neutral' },
};
const UNKNOWN_STATUS: StatusAppearance = { labelKey: 'drafts.status.other', tone: 'outline' };

export function isDraftReady(status: string): boolean {
  return status === READY_STATUS;
}

// @FollowsBlueprint core-view-intent
export function partitionDrafts<Draft extends DraftShape>(
  drafts: readonly Draft[],
): PartitionedDrafts<Draft> {
  return {
    ready: drafts.filter((draft) => isDraftReady(draft.status)),
    settled: drafts.filter((draft) => !isDraftReady(draft.status)),
  };
}

export function selectChannelAppearance(channel: string): ChannelAppearance {
  return CHANNEL_APPEARANCES[channel] ?? OTHER_CHANNEL;
}

export function selectDraftStatusAppearance(status: string): StatusAppearance {
  return STATUS_APPEARANCES[status] ?? UNKNOWN_STATUS;
}

export function summarizeDraftBody(body: string): string {
  return body.replaceAll(WHITESPACE_PATTERN, ' ').trim();
}

export function findDraft<Draft extends DraftShape>(
  drafts: readonly Draft[],
  slug: string,
): Draft | null {
  return drafts.find((draft) => draft.slug === slug) ?? null;
}

export function describeRecipients(recipients: readonly { readonly name: string }[]): string {
  return recipients.map((recipient) => recipient.name).join(', ');
}

export type DraftSheetIntent = 'copy' | 'open-link' | 'sent' | 'abandon';

export const DRAFT_SHEET_ACTION: Readonly<
  Record<DraftSheetIntent, { readonly labelKey: ParseKeys; readonly icon: IconName }>
> = {
  copy: { labelKey: 'drafts.copy', icon: 'copy' },
  'open-link': { labelKey: 'drafts.open-link', icon: 'open' },
  sent: { labelKey: 'drafts.sent', icon: 'sent' },
  abandon: { labelKey: 'drafts.abandon', icon: 'abandon' },
};

export function selectDraftSheetIntents(draft: {
  readonly status: string;
  readonly link?: string;
}): DraftSheetIntent[] {
  const linkIntents: DraftSheetIntent[] = draft.link === undefined ? [] : ['open-link'];
  const statusIntents: DraftSheetIntent[] = isDraftReady(draft.status) ? ['sent', 'abandon'] : [];
  return ['copy', ...linkIntents, ...statusIntents];
}
