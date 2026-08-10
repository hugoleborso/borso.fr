import type { TranslationKey } from '../i18n/i18n.utils';
import {
  ABANDONED_BAR_ON_DARK,
  ABANDONED_BAR_ON_LIGHT,
  ACCENT,
  ACTIVE_INNER_RULE,
  DASH_RULE,
  FAILURE_BAR,
  FAILURE_INK,
  INK,
  MUTED,
  PAPER,
  STRIPE_LIGHT,
  SUCCESS_BAR,
  WARNING_BAR,
  WARNING_INK,
} from '../theme/twelve-labours.theme';
import type { ChallengeKind, ChallengeStatus, ProofType } from './labours.types';

const STATUS_LABEL_KEY: Readonly<Record<ChallengeStatus, TranslationKey>> = {
  done: 'twelve-labours.status.done',
  partial: 'twelve-labours.status.partial',
  failed: 'twelve-labours.status.failed',
  abandoned: 'twelve-labours.status.abandoned',
  doing: 'twelve-labours.status.doing',
  todo: 'twelve-labours.status.todo',
};

// @FollowsBlueprint core-label-key
export function selectStatusLabelKey(status: ChallengeStatus): TranslationKey {
  return STATUS_LABEL_KEY[status];
}

const KIND_LABEL_KEY: Readonly<Record<ChallengeKind, TranslationKey>> = {
  daily: 'twelve-labours.kind.daily',
  count: 'twelve-labours.kind.count',
  oneshot: 'twelve-labours.kind.oneshot',
};

export function selectKindLabelKey(kind: ChallengeKind): TranslationKey {
  return KIND_LABEL_KEY[kind];
}

export interface TagColors {
  foreground: string;
  background: string;
  borderColor: string;
}

export const TRANSPARENT = 'transparent';

/** The value CSS gives a border that is not drawn at all. */
export const NO_BORDER = 'none';

const STATUS_FOREGROUND: Readonly<Record<ChallengeStatus, string>> = {
  done: INK,
  partial: WARNING_INK,
  failed: FAILURE_INK,
  abandoned: MUTED,
  doing: PAPER,
  todo: MUTED,
};

const IN_PROGRESS_STATUS: ChallengeStatus = 'doing';

/**
 * The one status that reverses the tag, so it reads as the live month.
 *
 * @Blueprint core-appearance
 * @BlueprintName Appearance Selector Core
 * @BlueprintUsage Use whenever a component would otherwise branch on a domain status to choose a colour, a class name, or a label key.
 * @BlueprintDescription Reads the colours out of frozen records keyed by the domain union, with the values imported from the theme module rather than written as hex, and returns the whole set a component applies. The record is typed `Record<ChallengeStatus, …>`, so adding a status is a type error here instead of a missing colour on the page, and the single named exception is compared against a named constant.
 */
export function selectStatusTagColors(status: ChallengeStatus): TagColors {
  const foreground = STATUS_FOREGROUND[status];
  if (status === IN_PROGRESS_STATUS) {
    return { foreground, background: ACCENT, borderColor: ACCENT };
  }
  return { foreground, background: TRANSPARENT, borderColor: foreground };
}

const FILMSTRIP_BAR_COLOR_BY_STATUS: Readonly<
  Record<ChallengeStatus, Readonly<Record<`${boolean}`, string>>>
> = {
  done: { true: SUCCESS_BAR, false: SUCCESS_BAR },
  partial: { true: WARNING_BAR, false: WARNING_BAR },
  failed: { true: FAILURE_BAR, false: FAILURE_BAR },
  doing: { true: ACCENT, false: ACCENT },
  abandoned: { true: ABANDONED_BAR_ON_DARK, false: ABANDONED_BAR_ON_LIGHT },
  todo: { true: ACTIVE_INNER_RULE, false: STRIPE_LIGHT },
};

export function selectFilmstripBarColor(status: ChallengeStatus, isActive: boolean): string {
  return FILMSTRIP_BAR_COLOR_BY_STATUS[status][`${isActive}`];
}

export type MediaProofType = 'photo' | 'video';

/**
 * Only the media section of a challenge renders through this, so every other
 * proof type resolves to the still image renderer rather than a branch.
 */
const MEDIA_PROOF_TYPE: Readonly<Record<ProofType, MediaProofType>> = {
  photo: 'photo',
  video: 'video',
  link: 'photo',
  note: 'photo',
  stat: 'photo',
};

export function selectMediaProofType(type: ProofType): MediaProofType {
  return MEDIA_PROOF_TYPE[type];
}

export type ProofChipShape = 'link' | 'plain';

const PROOF_CHIP_SHAPE: Readonly<Record<ProofType, ProofChipShape>> = {
  link: 'link',
  photo: 'plain',
  video: 'plain',
  note: 'plain',
  stat: 'plain',
};

export function selectProofChipShape(type: ProofType): ProofChipShape {
  return PROOF_CHIP_SHAPE[type];
}

const PROOF_ICON: Readonly<Record<ProofType, string>> = {
  photo: '◳',
  video: '▷',
  link: '↗',
  note: '¶',
  stat: '#',
};

export function selectProofIcon(type: ProofType): string {
  return PROOF_ICON[type];
}

export interface FilmstripCardColors {
  background: string;
  color: string;
  innerRuleColor: string;
  secondaryOpacity: number;
}

const FILMSTRIP_CARD_COLORS: Readonly<Record<`${boolean}`, FilmstripCardColors>> = {
  true: {
    background: INK,
    color: PAPER,
    innerRuleColor: ACTIVE_INNER_RULE,
    secondaryOpacity: 0.7,
  },
  false: {
    background: TRANSPARENT,
    color: INK,
    innerRuleColor: DASH_RULE,
    secondaryOpacity: 0.55,
  },
};

export function selectFilmstripCardColors(isActive: boolean): FilmstripCardColors {
  return FILMSTRIP_CARD_COLORS[`${isActive}`];
}

const FEATURED_ARTICLE_CLASS: Readonly<Record<`${boolean}`, string>> = {
  true: 'twelve-travaux-featured',
  false: 'twelve-travaux-featured twelve-travaux-featured--no-cover',
};

export function selectFeaturedArticleClassName(hasCover: boolean): string {
  return FEATURED_ARTICLE_CLASS[`${hasCover}`];
}

const FILMSTRIP_CARD_CLASS: Readonly<Record<`${boolean}`, string>> = {
  true: 'twelve-travaux-filmstrip-card is-active',
  false: 'twelve-travaux-filmstrip-card',
};

export function selectFilmstripCardClassName(isActive: boolean): string {
  return FILMSTRIP_CARD_CLASS[`${isActive}`];
}

const YEAR_BUTTON_COLORS: Readonly<Record<`${boolean}`, { background: string; color: string }>> = {
  true: { background: INK, color: PAPER },
  false: { background: TRANSPARENT, color: INK },
};

export function selectYearButtonColors(isSelected: boolean): { background: string; color: string } {
  return YEAR_BUTTON_COLORS[`${isSelected}`];
}
