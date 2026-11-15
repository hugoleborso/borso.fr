import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Textarea } from '../atoms/Textarea';
import {
  buildDecisionPayload,
  type DecisionChoice,
  type DecisionPayload,
} from './proposal-board.core';

export interface ProposalDecisionFormProps {
  readonly slug: string;
  readonly options: readonly string[];
  readonly isPending: boolean;
  readonly startsCommenting: boolean;
  readonly onDecided: (payload: DecisionPayload) => void;
}

// @FollowsBlueprint organism-form
export function ProposalDecisionForm({
  slug,
  options,
  isPending,
  startsCommenting,
  onDecided,
}: ProposalDecisionFormProps): JSX.Element {
  const { t } = useTranslation();
  const [isCommenting, setIsCommenting] = useState(startsCommenting);
  const form = useForm({ defaultValues: { comment: '' } });
  const commentId = `decision-comment-${slug}`;
  const hasOptions = options.length > 0;
  const decide = (choice: DecisionChoice): void => {
    onDecided(buildDecisionPayload(choice, form.getFieldValue('comment')));
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
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="quiet"
          size="icon"
          className="mr-auto"
          aria-label={t('proposals.comment')}
          aria-expanded={isCommenting}
          onClick={() => setIsCommenting((isOpen) => !isOpen)}
        >
          <Icon name="comment" size={20} />
        </Button>
        <Button
          variant="secondary"
          disabled={isPending}
          onClick={() => decide({ decision: 'refusee' })}
        >
          {t('proposals.refuse')}
        </Button>
        {hasOptions ? (
          options.map((option) => (
            <Button
              key={option}
              variant="primary"
              className="max-w-full text-center break-words"
              disabled={isPending}
              onClick={() => decide({ decision: 'acceptee', option })}
            >
              {option}
            </Button>
          ))
        ) : (
          <Button
            variant="primary"
            disabled={isPending}
            onClick={() => decide({ decision: 'acceptee' })}
          >
            <Icon name="check" size={18} />
            {t('proposals.accept')}
          </Button>
        )}
      </div>
    </div>
  );
}
