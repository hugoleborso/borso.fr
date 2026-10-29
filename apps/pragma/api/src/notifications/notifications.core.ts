import { z } from 'zod';

export const NOTIFICATION_CATEGORIES = [
  'takes',
  'take_comments',
  'sessions',
  'setlists',
  'streak',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_GROUP_WINDOW_MINUTES = 10;

const MILLISECONDS_PER_MINUTE = 60_000;
const NOTIFICATION_GROUP_WINDOW_MILLISECONDS =
  NOTIFICATION_GROUP_WINDOW_MINUTES * MILLISECONDS_PER_MINUTE;

export interface WriteActor {
  readonly memberId: string;
  readonly now: Date;
}

interface ActedEvent {
  readonly actorMemberId: string;
}

export interface TakeCreatedEvent extends ActedEvent {
  readonly kind: 'take-created';
  readonly takeId: string;
  readonly songId: string;
  readonly songTitle: string;
}

export interface TakeCommentCreatedEvent extends ActedEvent {
  readonly kind: 'take-comment-created';
  readonly takeId: string;
  readonly songId: string;
  readonly songTitle: string;
}

export interface SessionWrittenEvent extends ActedEvent {
  readonly kind: 'session-created' | 'session-changed';
  readonly sessionId: string;
  readonly sessionDate: string;
}

export interface SetlistChangedEvent extends ActedEvent {
  readonly kind: 'setlist-changed';
  readonly setlistId: string;
  readonly setlistName: string;
}

export interface SongLineupChangedEvent extends ActedEvent {
  readonly kind: 'song-lineup-changed';
  readonly songId: string;
  readonly songTitle: string;
}

export interface TransitionChangedEvent extends ActedEvent {
  readonly kind: 'transition-changed';
  readonly songAId: string;
  readonly songATitle: string;
  readonly songBId: string;
  readonly songBTitle: string;
}

export type NotificationEvent =
  | TakeCreatedEvent
  | TakeCommentCreatedEvent
  | SessionWrittenEvent
  | SetlistChangedEvent
  | SongLineupChangedEvent
  | TransitionChangedEvent;

export type PushDelivery = 'delivered' | 'expired' | 'failed';

export type PersonalPushOutcome = 'already-sent' | 'sent' | 'timed-out';

export interface PushDeliveryOutcome {
  readonly delivery: PushDelivery;
  readonly statusCode: number | null;
}

export interface RecipientSubscription {
  readonly memberId: string;
  readonly endpoint: string;
}

export interface CategoryPreference {
  readonly memberId: string;
  readonly category: string;
  readonly enabled: boolean;
}

export interface CategoryToggle {
  readonly category: NotificationCategory;
  readonly enabled: boolean;
}

export interface RecipientFilter {
  readonly actorMemberId: string;
  readonly category: NotificationCategory;
}

export interface PushFailureReport {
  readonly host: string;
  readonly statusCode: number | null;
}

const NOT_FOUND_STATUS = 404;
const GONE_STATUS = 410;
const EXPIRED_SUBSCRIPTION_STATUSES: ReadonlySet<number | null> = new Set<number | null>([
  NOT_FOUND_STATUS,
  GONE_STATUS,
]);

const statusCodeSchema = z.object({ statusCode: z.number() });

export function readPushFailureStatus(failure: unknown): number | null {
  const withStatus = statusCodeSchema.safeParse(failure);
  return withStatus.success ? withStatus.data.statusCode : null;
}

// @FollowsBlueprint core-decision
export function classifyPushFailure(failure: unknown): PushDelivery {
  const isExpired = EXPIRED_SUBSCRIPTION_STATUSES.has(readPushFailureStatus(failure));
  return isExpired ? 'expired' : 'failed';
}

export function selectExpiredEndpoints(
  targets: readonly { readonly endpoint: string }[],
  outcomes: readonly PushDeliveryOutcome[],
): string[] {
  return targets
    .filter((_, index) => outcomes[index]?.delivery === 'expired')
    .map((target) => target.endpoint);
}

export function selectFailureReports(
  targets: readonly { readonly endpoint: string }[],
  outcomes: readonly PushDeliveryOutcome[],
): PushFailureReport[] {
  return targets.flatMap((target, index) => {
    const outcome = outcomes[index];
    if (outcome?.delivery !== 'failed') return [];
    return [{ host: new URL(target.endpoint).host, statusCode: outcome.statusCode }];
  });
}

export function countDelivered(outcomes: readonly PushDeliveryOutcome[]): number {
  return outcomes.filter((outcome) => outcome.delivery === 'delivered').length;
}

export function selectCategory(event: NotificationEvent): NotificationCategory {
  switch (event.kind) {
    case 'take-created':
      return 'takes';
    case 'take-comment-created':
      return 'take_comments';
    case 'session-created':
    case 'session-changed':
      return 'sessions';
    case 'setlist-changed':
    case 'song-lineup-changed':
    case 'transition-changed':
      return 'setlists';
  }
}

export function isCategoryEnabled(
  preferencesOfMember: readonly CategoryPreference[],
  category: NotificationCategory,
): boolean {
  const stored = preferencesOfMember.find((preference) => preference.category === category);
  return stored?.enabled ?? true;
}

export function buildCategoryToggles(
  preferencesOfMember: readonly CategoryPreference[],
): CategoryToggle[] {
  return NOTIFICATION_CATEGORIES.map((category) => ({
    category,
    enabled: isCategoryEnabled(preferencesOfMember, category),
  }));
}

export function selectRecipients<Subscription extends RecipientSubscription>(
  subscriptions: readonly Subscription[],
  preferences: readonly CategoryPreference[],
  filter: RecipientFilter,
): Subscription[] {
  return subscriptions.filter(
    (subscription) =>
      subscription.memberId !== filter.actorMemberId &&
      isCategoryEnabled(
        preferences.filter((preference) => preference.memberId === subscription.memberId),
        filter.category,
      ),
  );
}

export function buildGroupKey(event: NotificationEvent): string {
  switch (event.kind) {
    case 'take-created':
      return `take:${event.takeId}`;
    case 'take-comment-created':
      return `take-comment:${event.takeId}`;
    case 'session-created':
    case 'session-changed':
      return `session:${event.sessionId}`;
    case 'setlist-changed':
      return `setlist:${event.setlistId}`;
    case 'song-lineup-changed':
      return `song-lineup:${event.songId}`;
    case 'transition-changed':
      return `transition:${event.songAId}:${event.songBId}`;
  }
}

export function isGroupDue(lastSentAt: Date | null, now: Date): boolean {
  if (lastSentAt === null) return true;
  return now.getTime() - lastSentAt.getTime() >= NOTIFICATION_GROUP_WINDOW_MILLISECONDS;
}

export function buildNotificationUrl(event: NotificationEvent): string {
  switch (event.kind) {
    case 'take-created':
    case 'take-comment-created':
      return `/catalog/${event.songId}?take=${event.takeId}`;
    case 'session-created':
    case 'session-changed':
      return `/sessions/${event.sessionId}`;
    case 'setlist-changed':
      return `/setlists/${event.setlistId}`;
    case 'song-lineup-changed':
      return `/catalog/${event.songId}`;
    case 'transition-changed':
      return `/catalog/${event.songAId}`;
  }
}

type MessageParameters = Readonly<Record<string, string>>;

function selectSubjectParameters(event: NotificationEvent): MessageParameters {
  switch (event.kind) {
    case 'take-created':
    case 'take-comment-created':
    case 'song-lineup-changed':
      return { songTitle: event.songTitle };
    case 'session-created':
    case 'session-changed':
      return { sessionDate: event.sessionDate };
    case 'setlist-changed':
      return { setlistName: event.setlistName };
    case 'transition-changed':
      return { songATitle: event.songATitle, songBTitle: event.songBTitle };
  }
}

export type StreakReminderKey = 'streak-at-risk' | 'streak-band-count' | 'streak-band-count-one';

export interface NotificationPayload {
  readonly messageKey: NotificationEvent['kind'] | StreakReminderKey;
  readonly parameters: MessageParameters;
  readonly url: string;
  readonly tag: string;
}

export function buildNotificationPayload(
  event: NotificationEvent,
  actorName: string | null,
): NotificationPayload {
  return {
    messageKey: event.kind,
    parameters: {
      ...(actorName === null ? {} : { actorName }),
      ...selectSubjectParameters(event),
    },
    url: buildNotificationUrl(event),
    tag: buildGroupKey(event),
  };
}
