import type { PromptLeadFont } from '@/components/atoms/PromptLine';
import type { ReviewStatus } from '@/review/review-machine.utils';

export interface ReviewPromptTexts {
  question: string;
  context: string;
  notation: string;
  words: string;
  outcome: string;
}

export interface ReviewPrompt {
  lead: string;
  detail: string;
  leadFont: PromptLeadFont;
  spoken: string;
}

// @FollowsBlueprint utils-pure-module
export function selectReviewPrompt(status: ReviewStatus, texts: ReviewPromptTexts): ReviewPrompt {
  if (status === 'recalled' || status === 'missed') {
    return {
      lead: texts.notation,
      detail: texts.words,
      leadFont: 'notation',
      spoken: texts.outcome,
    };
  }
  return { lead: texts.question, detail: texts.context, leadFont: 'text', spoken: '' };
}
