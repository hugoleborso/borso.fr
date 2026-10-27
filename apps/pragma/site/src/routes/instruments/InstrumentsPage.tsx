/** @Feature instruments */

import { INSTRUMENT_NAME_MAX_LENGTH } from '@domain/input-limits.core';
import {
  FALLBACK_INSTRUMENT_ICON,
  INSTRUMENT_FAMILIES,
  type InstrumentFamily,
  type InstrumentIcon,
} from '@domain/instrument.core';
import { useForm } from '@tanstack/react-form';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { Chip } from '../../components/atoms/Chip';
import { Card } from '../../components/atoms/Card';
import { Icon, type IconName } from '../../components/atoms/Icon';
import { Input } from '../../components/atoms/Input';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { InstrumentIconPicker } from '../../components/molecules/InstrumentIconPicker';
import { PageHeader } from '../../components/molecules/PageHeader';
import { InstrumentsList } from '../../components/organisms/InstrumentsList';
import { ApiError } from '../../lib/api.client';
import {
  useCreateInstrument,
  useDeleteInstrument,
  useInstrumentsList,
  useReorderInstruments,
  useUpdateInstrument,
} from '../../lib/queries/instruments.queries';
import { useAssignMemberInstruments, useMembersList } from '../../lib/queries/members.queries';
import {
  claimOfMember,
  INSTRUMENT_FAMILY_LABEL_KEY,
  INSTRUMENT_ICON_LABEL_KEY,
  selectInstrumentDeletionEffect,
  togglePrimacy,
} from './instruments-page.core';

interface SelectedInstrument {
  id: string;
  name: string;
  family: InstrumentFamily;
  icon: InstrumentIcon;
}

const DEFAULT_NEW_INSTRUMENT_FAMILY: InstrumentFamily = 'harmonic';
const INSTRUMENT_FAMILY_ICON = {
  harmonic: 'instr',
  percussive: 'bolt',
  vocal: 'mic',
  other: 'more',
} as const satisfies Readonly<Record<InstrumentFamily, IconName>>;
const INSTRUMENT_NAME_MIN_LENGTH = 1;
const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint route-list-page
export function InstrumentsPage(): JSX.Element {
  const { t } = useTranslation();
  const list = useInstrumentsList();
  const membersQuery = useMembersList();
  const create = useCreateInstrument();
  const update = useUpdateInstrument();
  const remove = useDeleteInstrument();
  const reorder = useReorderInstruments();
  const assignInstruments = useAssignMemberInstruments();
  const [selected, setSelected] = useState<SelectedInstrument | null>(null);
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: selected?.name ?? '',
      family: selected?.family ?? DEFAULT_NEW_INSTRUMENT_FAMILY,
      icon: selected?.icon ?? FALLBACK_INSTRUMENT_ICON,
    },
    onSubmit: async ({ value }) => {
      const trimmed = value.name.trim();
      if (trimmed.length === 0) return;
      if (selected === null) {
        await create.mutateAsync({ name: trimmed, family: value.family, icon: value.icon });
      } else {
        await update.mutateAsync({
          id: selected.id,
          name: trimmed,
          family: value.family,
          icon: value.icon,
        });
      }
      setSelected(null);
      form.reset();
    },
  });

  const instruments = useMemo(() => list.data?.instruments ?? NO_ROWS, [list.data]);
  const members = useMemo(() => membersQuery.data?.members ?? NO_ROWS, [membersQuery.data]);
  const membersById = useMemo(() => {
    const out: Record<string, (typeof members)[number]> = {};
    for (const member of members) out[member.id] = member;
    return out;
  }, [members]);

  const rows = useMemo(
    () =>
      instruments.map((instrument) => ({
        id: instrument.id,
        name: instrument.name,
        icon: instrument.icon,
        familyLabel: t(INSTRUMENT_FAMILY_LABEL_KEY[instrument.family]),
        players: instrument.players.flatMap((player) => {
          const member = membersById[player.memberId];
          if (member === undefined) return [];
          return [
            {
              memberId: player.memberId,
              memberName: member.firstName,
              memberColor: member.color,
              isPrimary: player.isPrimary,
            },
          ];
        }),
      })),
    [instruments, membersById, t],
  );

  const selectInstrument = (instrumentId: string): void => {
    const row = instruments.find((instrument) => instrument.id === instrumentId);
    if (row === undefined) return;
    setSelected({ id: row.id, name: row.name, family: row.family, icon: row.icon });
    form.setFieldValue('name', row.name);
    form.setFieldValue('family', row.family);
    form.setFieldValue('icon', row.icon);
  };

  const clearSelection = (): void => {
    setSelected(null);
    form.reset();
  };

  const applyDeletionEffect = {
    'keep-form': (): void => undefined,
    'clear-form': clearSelection,
  } as const;

  const removeInstrument = (instrumentId: string): void => {
    remove.mutate({ id: instrumentId });
    applyDeletionEffect[selectInstrumentDeletionEffect(selected?.id ?? null, instrumentId)]();
  };

  const toggleMemberPrimacy = (instrumentId: string, memberId: string): void => {
    const claim = claimOfMember(instruments, memberId);
    assignInstruments.mutate({
      memberId,
      instrumentIds: claim.instrumentIds,
      primaryInstrumentIds: togglePrimacy(claim.primaryInstrumentIds, instrumentId),
    });
  };

  const lastError: unknown =
    list.error ?? create.error ?? update.error ?? remove.error ?? reorder.error ?? null;
  const errorMessage =
    lastError instanceof ApiError ? lastError.message : lastError ? 'unknown-error' : null;

  return (
    <section className="px-4 sm:px-9 py-4 sm:py-7 pb-20 max-w-[1280px]">
      <PageHeader title={t('instruments.title')} />
      {errorMessage === null ? null : (
        <p className="text-danger text-meta mb-3" role="alert">
          {errorMessage}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="flex flex-col gap-2">
          {list.isLoading ? (
            <p className="text-ink-soft italic text-meta m-0">{t('common.loading')}</p>
          ) : null}
          <InstrumentsList
            rows={rows}
            listLabel={t('instruments.title')}
            dragHandleLabel={t('instruments.dragHandle')}
            primaryToggleLabel={t('instruments.togglePrimary')}
            deleteLabel={t('common.delete')}
            onSelect={selectInstrument}
            onTogglePrimary={toggleMemberPrimacy}
            onDelete={setPendingDeletionId}
            onReorder={(orderedInstrumentIds) =>
              reorder.mutate({ instrumentIds: [...orderedInstrumentIds] })
            }
          />
        </div>
        <Card className="flex flex-col gap-3">
          <h3 className="font-display text-title text-ink m-0">
            {selected === null ? t('instruments.newTitle') : t('instruments.editTitle')}
          </h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
            className="flex flex-col gap-2.5"
          >
            <label
              className="text-label tracking-wider uppercase text-ink-soft font-medium"
              htmlFor="instrument-name"
            >
              {t('instruments.name')}
            </label>
            <form.Field name="name">
              {(field) => (
                <Input
                  id="instrument-name"
                  type="text"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  required
                  minLength={INSTRUMENT_NAME_MIN_LENGTH}
                  maxLength={INSTRUMENT_NAME_MAX_LENGTH}
                />
              )}
            </form.Field>
            <span className="text-label tracking-wider uppercase text-ink-soft font-medium">
              {t('instruments.icon')}
            </span>
            <form.Field name="icon">
              {(field) => (
                <InstrumentIconPicker
                  value={field.state.value}
                  labelOf={(icon) => t(INSTRUMENT_ICON_LABEL_KEY[icon])}
                  onPick={(icon) => field.handleChange(icon)}
                />
              )}
            </form.Field>
            <span className="text-label tracking-wider uppercase text-ink-soft font-medium">
              {t('instruments.family')}
            </span>
            <form.Field name="family">
              {(field) => (
                <div className="flex flex-wrap gap-1.5" role="group">
                  {INSTRUMENT_FAMILIES.map((family) => (
                    <Chip
                      key={family}
                      pressed={field.state.value === family}
                      onPress={() => field.handleChange(family)}
                    >
                      <Icon name={INSTRUMENT_FAMILY_ICON[family]} />
                      {t(INSTRUMENT_FAMILY_LABEL_KEY[family])}
                    </Chip>
                  ))}
                </div>
              )}
            </form.Field>
            <div className="flex gap-2 mt-2">
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button
                    icon="check"
                    type="submit"
                    variant="primary"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {t('common.save')}
                  </Button>
                )}
              </form.Subscribe>
              {selected === null ? null : (
                <Button icon="close" type="button" variant="quiet" onClick={clearSelection}>
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
      {pendingDeletionId === null ? null : (
        <ConfirmDialog
          question={t('instruments.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onConfirm={() => {
            removeInstrument(pendingDeletionId);
            setPendingDeletionId(null);
          }}
          onCancel={() => setPendingDeletionId(null)}
        />
      )}
    </section>
  );
}
