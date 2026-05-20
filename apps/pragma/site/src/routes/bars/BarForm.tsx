/**
 * Bar edit / create form. Extracted from BarsPage so the parent stays
 * under the file-length limit and the form can be unit-tested in
 * isolation if needed.
 */

import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';

export const BAR_STATUSES = ['lead', 'contacted', 'booked', 'played', 'cold'] as const;
export type BarStatus = (typeof BAR_STATUSES)[number];

export const BAR_STATUS_KEY: Record<BarStatus, string> = {
  lead: 'bars.statusLead',
  contacted: 'bars.statusContacted',
  booked: 'bars.statusBooked',
  played: 'bars.statusPlayed',
  cold: 'bars.statusCold',
};

export interface BarDraftState {
  id: string | null;
  name: string;
  status: BarStatus;
  notes: string;
  city: string;
  capacity: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export const BLANK_BAR_DRAFT: BarDraftState = {
  id: null,
  name: '',
  status: 'lead',
  notes: '',
  city: '',
  capacity: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
};

interface BarFormProps {
  readonly draft: BarDraftState;
  readonly onChange: (draft: BarDraftState) => void;
  readonly onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  readonly onCancel: () => void;
}

const FIELD_LABEL_CLASS =
  'text-[11px] tracking-wider uppercase text-ink-400 font-medium';

export function BarForm({ draft, onChange, onSubmit, onCancel }: BarFormProps): JSX.Element {
  const { t } = useTranslation();
  const patch = (changes: Partial<BarDraftState>): void => onChange({ ...draft, ...changes });
  return (
    <Card>
      <h3 className="font-display italic text-2xl text-ink-900 m-0 mb-3">
        {draft.id === null ? t('bars.newBar') : draft.name}
      </h3>
      <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-name">
          {t('bars.name')}
        </label>
        <Input
          id="bar-name"
          type="text"
          value={draft.name}
          onChange={(event) => patch({ name: event.target.value })}
          required
        />
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-status">
          {t('bars.status')}
        </label>
        <select
          id="bar-status"
          value={draft.status}
          onChange={(event) => {
            const parsed = z.enum(BAR_STATUSES).safeParse(event.target.value);
            if (parsed.success) patch({ status: parsed.data });
          }}
          className="w-full bg-bg-elev border border-line text-ink-900 rounded-md px-3 py-2 text-[13px] outline-none focus:border-ink-700"
        >
          {BAR_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(BAR_STATUS_KEY[status])}
            </option>
          ))}
        </select>
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-city">
          {t('bars.city')}
        </label>
        <Input
          id="bar-city"
          type="text"
          value={draft.city}
          onChange={(event) => patch({ city: event.target.value })}
        />
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-capacity">
          {t('bars.capacity')}
        </label>
        <Input
          id="bar-capacity"
          type="number"
          min={0}
          value={draft.capacity}
          onChange={(event) => patch({ capacity: event.target.value })}
        />
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-contact">
          {t('bars.contactName')}
        </label>
        <Input
          id="bar-contact"
          type="text"
          value={draft.contactName}
          onChange={(event) => patch({ contactName: event.target.value })}
        />
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-email">
          {t('bars.contactEmail')}
        </label>
        <Input
          id="bar-email"
          type="email"
          value={draft.contactEmail}
          onChange={(event) => patch({ contactEmail: event.target.value })}
        />
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-phone">
          {t('bars.contactPhone')}
        </label>
        <Input
          id="bar-phone"
          type="tel"
          value={draft.contactPhone}
          onChange={(event) => patch({ contactPhone: event.target.value })}
        />
        <label className={FIELD_LABEL_CLASS} htmlFor="bar-notes">
          {t('bars.notes')}
        </label>
        <textarea
          id="bar-notes"
          value={draft.notes}
          onChange={(event) => patch({ notes: event.target.value })}
          rows={4}
          className="w-full bg-bg-elev border border-line rounded-md px-3 py-2 text-xs font-mono text-ink-700 outline-none focus:border-ink-700 resize-y"
        />
        <div className="flex gap-2 mt-2">
          <Button type="submit" variant="accent">
            {t('common.save')}
          </Button>
          {draft.id !== null ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
