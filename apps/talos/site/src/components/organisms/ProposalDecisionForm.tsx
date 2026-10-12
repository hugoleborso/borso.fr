import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Textarea } from '../atoms/Textarea';
import type { ProposalDecision } from '@domain/proposal.core';
import { buildDecisionPayload } from './proposal-board.core';

export interface ProposalDecisionFormProps {
  readonly slug: string;
  readonly isPending: boolean;
  readonly startsCommenting: boolean;
  readonly onDecided: (payload: { decision: ProposalDecision; comment?: string }) => void;
}

// @FollowsBlueprint organism-form
export function ProposalDecisionForm({
  slug,
  isPending,
  startsCommenting,
  onDecided,
}: ProposalDecisionFormProps): JSX.Element {
  const { t } = useTranslation();
  const [isCommenting, setIsCommenting] = useState(startsCommenting);
  const form = useForm({ defaultValues: { comment: '' } });
  const commentId = `decision-comment-${slug}`;
  const decide = (decision: ProposalDecision): void => {
    onDecided(buildDecisionPayload(decision, form.getFieldValue('comment')));
  };
  return (
    <div className="flex flex-col gap-3">
      {isCommenting ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={commentId} className="sr-only">
            {t('proposals.comment')}
          </label>
          <form.Field name="comment">
            {(field) => (
              <Textarea
                id={commentId}
                rows={2}
                className="min-h-20"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          variant="quiet"
          size="icon"
          aria-label={t('proposals.comment')}
          aria-expanded={isCommenting}
          onClick={() => setIsCommenting((isOpen) => !isOpen)}
        >
          <Icon name="comment" size={20} />
        </Button>
        <span className="flex-1" />
        <Button variant="secondary" disabled={isPending} onClick={() => decide('refusee')}>
          {t('proposals.refuse')}
        </Button>
        <Button variant="primary" disabled={isPending} onClick={() => decide('acceptee')}>
          <Icon name="check" size={18} />
          {t('proposals.accept')}
        </Button>
      </div>
    </div>
  );
}
