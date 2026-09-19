import { MAXIMUM_BID_BANANAS, MINIMUM_BID_BANANAS, refuseBid } from '@domain/bid.core';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';
import { ChunkyButton } from '../atoms/ChunkyButton';
import { FieldLabel } from '../atoms/FieldLabel';

const TIMID_BID = 1;
const SMALL_BID = 5;
const STARTING_STASH_BID = 10;
const BOLD_BID = 25;
const RECKLESS_BID = 50;
const RUINOUS_BID = 100;

const QUICK_BIDS = [
  TIMID_BID,
  SMALL_BID,
  STARTING_STASH_BID,
  BOLD_BID,
  RECKLESS_BID,
  RUINOUS_BID,
] as const;

export interface BidPadProps {
  readonly onBid: (amount: number) => void;
  readonly submitting: boolean;
}

/**
 * @Blueprint organism-form-sharing-the-domain-rule
 * @BlueprintUsage Use for a form whose validation rule the API enforces too, so the two cannot drift.
 * @BlueprintName Organism Form Sharing The Domain Rule
 * @BlueprintDescription Validates through the same `refuseBid` the API schema is built from, so a rule lives in one file and both sides read it rather than each carrying its own copy of the bounds. The refusal it returns is a named code, which the component turns into a sentence through the translation catalogue, so the rule holds no language and the form holds no bound. The quick buttons submit the same way the field does, so there is one submission path and no second place where a bid could skip validation.
 */
export function BidPad({ onBid, submitting }: BidPadProps) {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { amount: '' },
    onSubmit: ({ value }) => {
      onBid(Number(value.amount));
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="amount"
        validators={{
          onChange: ({ value }) => {
            if (value === '') return undefined;
            const refusal = refuseBid(Number(value));
            return refusal === null
              ? undefined
              : t('errors.bidOutOfRange', { max: MAXIMUM_BID_BANANAS });
          },
        }}
      >
        {(field) => (
          <div>
            <FieldLabel htmlFor={field.name}>{t('game.bidLabel')}</FieldLabel>
            <input
              id={field.name}
              name={field.name}
              type="number"
              inputMode="numeric"
              autoComplete="off"
              min={MINIMUM_BID_BANANAS}
              max={MAXIMUM_BID_BANANAS}
              placeholder={t('game.bidPlaceholder')}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
              }}
              className="w-full rounded-chunk border-[3px] border-ink bg-cream px-4 py-3 text-center text-4xl font-black tabular-nums shadow-chunk-sm outline-none focus-visible:bg-peel-soft"
            />
            {field.state.meta.errors.length > 0 ? (
              <p className="mt-1.5 text-sm font-bold text-coral">
                {field.state.meta.errors.join(' ')}
              </p>
            ) : null}
          </div>
        )}
      </form.Field>

      <div className="grid grid-cols-3 gap-2">
        {QUICK_BIDS.map((amount) => (
          <ChunkyButton
            key={amount}
            tone="cream"
            size="medium"
            disabled={submitting}
            onClick={() => {
              onBid(amount);
            }}
          >
            {amount}
          </ChunkyButton>
        ))}
      </div>

      <form.Subscribe selector={(state) => [state.canSubmit, state.values.amount] as const}>
        {([canSubmit, amount]) => (
          <ChunkyButton
            type="submit"
            tone="leaf"
            size="large"
            disabled={submitting || !canSubmit || amount === ''}
          >
            {submitting ? t('game.submittingBid') : t('game.submitBid')}
          </ChunkyButton>
        )}
      </form.Subscribe>
    </form>
  );
}
