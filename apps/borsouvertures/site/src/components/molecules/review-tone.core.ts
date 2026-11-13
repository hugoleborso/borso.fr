import type { StatusBandTone } from '@/components/atoms/status-band.variants';
import type { ReviewStatus } from '@/review/review-machine.utils';

// @FollowsBlueprint component-lookup-table
export const TONE_BY_REVIEW_STATUS = {
  'opponent-moving': 'asking',
  'your-move': 'asking',
  recalled: 'recalled',
  missed: 'missed',
} as const satisfies Record<ReviewStatus, StatusBandTone>;
