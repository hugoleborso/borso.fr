/**
 * Bar edit / create form. Extracted from BarsPage so the parent stays
 * under the file-length limit and the form can be unit-tested in
 * isolation if needed.
 */

import { useTranslation } from 'react-i18next';
import { z } from 'zod';

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

export function BarForm({ draft, onChange, onSubmit, onCancel }: BarFormProps): JSX.Element {
  const { t } = useTranslation();
  const patch = (changes: Partial<BarDraftState>): void => onChange({ ...draft, ...changes });
  return (
    <form onSubmit={onSubmit} className="admin-page-form">
      <h3 className="admin-page-form-title">
        {draft.id === null ? t('bars.newBar') : draft.name}
      </h3>
      <label className="admin-page-form-label" htmlFor="bar-name">
        {t('bars.name')}
      </label>
      <input
        id="bar-name"
        type="text"
        value={draft.name}
        onChange={(event) => patch({ name: event.target.value })}
        required
        className="admin-page-form-input"
      />
      <label className="admin-page-form-label" htmlFor="bar-status">
        {t('bars.status')}
      </label>
      <select
        id="bar-status"
        value={draft.status}
        onChange={(event) => {
          const parsed = z.enum(BAR_STATUSES).safeParse(event.target.value);
          if (parsed.success) patch({ status: parsed.data });
        }}
        className="admin-page-form-input"
      >
        {BAR_STATUSES.map((status) => (
          <option key={status} value={status}>
            {t(BAR_STATUS_KEY[status])}
          </option>
        ))}
      </select>
      <label className="admin-page-form-label" htmlFor="bar-city">
        {t('bars.city')}
      </label>
      <input
        id="bar-city"
        type="text"
        value={draft.city}
        onChange={(event) => patch({ city: event.target.value })}
        className="admin-page-form-input"
      />
      <label className="admin-page-form-label" htmlFor="bar-capacity">
        {t('bars.capacity')}
      </label>
      <input
        id="bar-capacity"
        type="number"
        min={0}
        value={draft.capacity}
        onChange={(event) => patch({ capacity: event.target.value })}
        className="admin-page-form-input"
      />
      <label className="admin-page-form-label" htmlFor="bar-contact">
        {t('bars.contactName')}
      </label>
      <input
        id="bar-contact"
        type="text"
        value={draft.contactName}
        onChange={(event) => patch({ contactName: event.target.value })}
        className="admin-page-form-input"
      />
      <label className="admin-page-form-label" htmlFor="bar-email">
        {t('bars.contactEmail')}
      </label>
      <input
        id="bar-email"
        type="email"
        value={draft.contactEmail}
        onChange={(event) => patch({ contactEmail: event.target.value })}
        className="admin-page-form-input"
      />
      <label className="admin-page-form-label" htmlFor="bar-phone">
        {t('bars.contactPhone')}
      </label>
      <input
        id="bar-phone"
        type="tel"
        value={draft.contactPhone}
        onChange={(event) => patch({ contactPhone: event.target.value })}
        className="admin-page-form-input"
      />
      <label className="admin-page-form-label" htmlFor="bar-notes">
        {t('bars.notes')}
      </label>
      <textarea
        id="bar-notes"
        value={draft.notes}
        onChange={(event) => patch({ notes: event.target.value })}
        rows={4}
        className="admin-page-form-input"
      />
      <div className="admin-page-form-actions">
        <button type="submit" className="admin-page-form-submit">
          {t('common.save')}
        </button>
        {draft.id !== null ? (
          <button type="button" className="admin-page-form-cancel" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        ) : null}
      </div>
    </form>
  );
}
