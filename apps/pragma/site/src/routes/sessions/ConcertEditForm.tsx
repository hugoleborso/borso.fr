/**
 * Concert detail edit form. Owns its field state via `useForm`. The
 * parent (`SessionDetailPage`) supplies the initial values + a single
 * `onSubmit(payload)` callback; the form is keyed on session id so
 * React mounts a fresh instance whenever a different session is
 * being edited.
 *
 * The friends-count grid is modelled as a nested `friends` field of
 * `Record<memberId, number>` — TanStack Form handles arbitrary-shape
 * objects natively.
 */

import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { composeClassName } from '../../components/atoms/class-name.utils';
import { Input } from '../../components/atoms/Input';
import { readableForeground } from '../../lib/member-color.utils';

export interface ConcertEditFormMember {
  readonly id: string;
  readonly firstName: string;
  readonly color: string;
}

export interface ConcertEditFormPayload {
  readonly venue: string;
  readonly capacity: string;
  readonly gear: string;
  readonly friends: Record<string, number>;
}

interface ConcertEditFormProps {
  readonly members: readonly ConcertEditFormMember[];
  readonly initial: ConcertEditFormPayload;
  readonly onSubmit: (payload: ConcertEditFormPayload) => void;
  readonly onCancel: () => void;
}

const FRIENDS_PER_MEMBER_MAX = 1_000;
const VENUE_MAX = 256;
const GEAR_MAX = 2_048;
const LABEL_CLASS = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';

const concertFormSchema = z.object({
  venue: z.string().max(VENUE_MAX),
  capacity: z.string().regex(/^\d*$/u),
  gear: z.string().max(GEAR_MAX),
  friends: z.record(z.string(), z.number().int().min(0).max(FRIENDS_PER_MEMBER_MAX)),
});

// @FollowsBlueprint route-form
export function ConcertEditForm({
  members,
  initial,
  onSubmit,
  onCancel,
}: ConcertEditFormProps): JSX.Element {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: initial,
    validators: { onChange: concertFormSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });
  return (
    <Card>
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <label className={LABEL_CLASS} htmlFor="session-venue">
          {t('sessions.venue')}
        </label>
        <form.Field name="venue">
          {(field) => (
            <Input
              id="session-venue"
              type="text"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              maxLength={VENUE_MAX}
            />
          )}
        </form.Field>
        <label className={LABEL_CLASS} htmlFor="session-capacity">
          {t('sessions.capacity')}
        </label>
        <form.Field name="capacity">
          {(field) => (
            <Input
              id="session-capacity"
              type="number"
              min={0}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
        <label className={LABEL_CLASS} htmlFor="session-gear">
          {t('sessions.gear')}
        </label>
        <form.Field name="gear">
          {(field) => (
            <textarea
              id="session-gear"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              className="w-full bg-bg-elev border border-line rounded-md px-3 py-2 text-xs font-mono text-ink-700 outline-none focus:border-ink-700 resize-y"
              rows={4}
              maxLength={GEAR_MAX}
            />
          )}
        </form.Field>
        <fieldset className="border border-line rounded-md p-3 mt-2">
          <legend className={composeClassName(LABEL_CLASS, 'px-2')}>
            {t('sessions.friendsCountPerMember')}
          </legend>
          <form.Field name="friends">
            {(friendsField) => (
              <>
                <div className="flex flex-col gap-2">
                  {members.map((member) => (
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
                        value={friendsField.state.value[member.id] ?? 0}
                        onChange={(event) => {
                          const clamped = Math.max(
                            0,
                            Math.min(FRIENDS_PER_MEMBER_MAX, Number(event.target.value)),
                          );
                          friendsField.handleChange({
                            ...friendsField.state.value,
                            [member.id]: clamped,
                          });
                        }}
                        onBlur={friendsField.handleBlur}
                        className="w-20 text-right bg-bg-elev border border-line rounded-md px-2 py-1 text-xs font-mono outline-none focus:border-ink-700"
                        aria-label={`${t('sessions.friendsCount')} — ${member.firstName}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-ink-500 mt-3 text-right font-mono">
                  {t('sessions.friendsCount')} :{' '}
                  <span className="text-ink-900">
                    {Object.values(friendsField.state.value).reduce(
                      (accumulator, current) => accumulator + current,
                      0,
                    )}
                  </span>
                </p>
              </>
            )}
          </form.Field>
        </fieldset>
        <div className="flex gap-2 mt-2">
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" variant="accent" disabled={!canSubmit || isSubmitting}>
                {t('sessions.saveConcertDetails')}
              </Button>
            )}
          </form.Subscribe>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
