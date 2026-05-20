/**
 * Concert detail edit form. Lives inside SessionDetailPage and is
 * extracted into its own file so the parent stays under the
 * file-length limit and so the friends-count-per-member grid is easy
 * to reason about in isolation.
 */

import { useTranslation } from 'react-i18next';
import { readableForeground } from '../../lib/member-color.utils';

export interface ConcertEditFormMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

interface ConcertEditFormProps {
  readonly members: readonly ConcertEditFormMember[];
  readonly venueDraft: string;
  readonly capacityDraft: string;
  readonly gearDraft: string;
  readonly friendsDraft: Record<string, number>;
  readonly onVenueChange: (value: string) => void;
  readonly onCapacityChange: (value: string) => void;
  readonly onGearChange: (value: string) => void;
  readonly onFriendsChange: (next: Record<string, number>) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

const FRIENDS_PER_MEMBER_MAX = 1_000;

export function ConcertEditForm(props: ConcertEditFormProps): JSX.Element {
  const { t } = useTranslation();
  const friendsTotal = Object.values(props.friendsDraft).reduce(
    (accumulator, current) => accumulator + current,
    0,
  );
  return (
    <form
      className="admin-page-form session-detail-form"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <label className="admin-page-form-label" htmlFor="session-venue">
        {t('sessions.venue')}
      </label>
      <input
        id="session-venue"
        type="text"
        value={props.venueDraft}
        onChange={(event) => props.onVenueChange(event.target.value)}
        className="admin-page-form-input"
        maxLength={256}
      />
      <label className="admin-page-form-label" htmlFor="session-capacity">
        {t('sessions.capacity')}
      </label>
      <input
        id="session-capacity"
        type="number"
        min={0}
        value={props.capacityDraft}
        onChange={(event) => props.onCapacityChange(event.target.value)}
        className="admin-page-form-input"
      />
      <label className="admin-page-form-label" htmlFor="session-gear">
        {t('sessions.gear')}
      </label>
      <textarea
        id="session-gear"
        value={props.gearDraft}
        onChange={(event) => props.onGearChange(event.target.value)}
        className="admin-page-form-input"
        rows={4}
        maxLength={2_048}
      />
      <fieldset className="admin-page-form-fieldset">
        <legend>{t('sessions.friendsCountPerMember')}</legend>
        {props.members.map((member) => (
          <div key={member.id} className="session-friends-row">
            <span
              className="member-chip"
              style={{
                background: member.color,
                color: readableForeground(member.color),
              }}
            >
              {member.firstName.slice(0, 1).toUpperCase()}
            </span>
            <span className="session-friends-member-name">{member.firstName}</span>
            <input
              type="number"
              min={0}
              max={FRIENDS_PER_MEMBER_MAX}
              value={props.friendsDraft[member.id] ?? 0}
              onChange={(event) => {
                const clamped = Math.max(
                  0,
                  Math.min(FRIENDS_PER_MEMBER_MAX, Number(event.target.value)),
                );
                props.onFriendsChange({ ...props.friendsDraft, [member.id]: clamped });
              }}
              className="admin-page-form-input session-friends-input"
              aria-label={`${t('sessions.friendsCount')} — ${member.firstName}`}
            />
          </div>
        ))}
        <p className="session-friends-total">
          {t('sessions.friendsCount')} : {friendsTotal}
        </p>
      </fieldset>
      <div className="admin-page-form-actions">
        <button type="submit" className="admin-page-form-submit">
          {t('sessions.saveConcertDetails')}
        </button>
        <button
          type="button"
          className="admin-page-form-cancel"
          onClick={props.onCancel}
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
