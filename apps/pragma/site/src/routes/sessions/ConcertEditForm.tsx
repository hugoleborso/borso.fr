/**
 * Concert detail edit form. Lives inside SessionDetailPage and is
 * extracted into its own file so the parent stays under the
 * file-length limit and so the friends-count-per-member grid is easy
 * to reason about in isolation.
 */

import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
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
const LABEL_CLASS = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';

export function ConcertEditForm(props: ConcertEditFormProps): JSX.Element {
  const { t } = useTranslation();
  const friendsTotal = Object.values(props.friendsDraft).reduce(
    (accumulator, current) => accumulator + current,
    0,
  );
  return (
    <Card>
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <label className={LABEL_CLASS} htmlFor="session-venue">
          {t('sessions.venue')}
        </label>
        <Input
          id="session-venue"
          type="text"
          value={props.venueDraft}
          onChange={(event) => props.onVenueChange(event.target.value)}
          maxLength={256}
        />
        <label className={LABEL_CLASS} htmlFor="session-capacity">
          {t('sessions.capacity')}
        </label>
        <Input
          id="session-capacity"
          type="number"
          min={0}
          value={props.capacityDraft}
          onChange={(event) => props.onCapacityChange(event.target.value)}
        />
        <label className={LABEL_CLASS} htmlFor="session-gear">
          {t('sessions.gear')}
        </label>
        <textarea
          id="session-gear"
          value={props.gearDraft}
          onChange={(event) => props.onGearChange(event.target.value)}
          className="w-full bg-bg-elev border border-line rounded-md px-3 py-2 text-xs font-mono text-ink-700 outline-none focus:border-ink-700 resize-y"
          rows={4}
          maxLength={2_048}
        />
        <fieldset className="border border-line rounded-md p-3 mt-2">
          <legend className={`${LABEL_CLASS} px-2`}>
            {t('sessions.friendsCountPerMember')}
          </legend>
          <div className="flex flex-col gap-2">
            {props.members.map((member) => (
              <div key={member.id} className="flex items-center gap-2.5">
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold"
                  style={{
                    background: member.color,
                    color: readableForeground(member.color),
                  }}
                >
                  {member.firstName.slice(0, 1).toUpperCase()}
                </span>
                <span className="flex-1 text-[13px] text-ink-700">{member.firstName}</span>
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
                  className="w-20 text-right bg-bg-elev border border-line rounded-md px-2 py-1 text-xs font-mono outline-none focus:border-ink-700"
                  aria-label={`${t('sessions.friendsCount')} — ${member.firstName}`}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-500 mt-3 text-right font-mono">
            {t('sessions.friendsCount')} : <span className="text-ink-900">{friendsTotal}</span>
          </p>
        </fieldset>
        <div className="flex gap-2 mt-2">
          <Button type="submit" variant="accent">
            {t('sessions.saveConcertDetails')}
          </Button>
          <Button type="button" variant="ghost" onClick={props.onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
