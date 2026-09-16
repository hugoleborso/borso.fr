/** @Feature compositions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { HintText } from '../atoms/HintText';
import { MemberLineup, type LineupInstrument, type LineupMember } from '../molecules/MemberLineup';
import { SongNotes } from '../molecules/SongNotes';
import { selectSongNoteSections } from '../../routes/catalog/song-notes.core';
import { StatusChip } from '../molecules/StatusChip';
import { TaskRow } from '../molecules/TaskRow';
import { UploadedChartPreview } from '../molecules/UploadedChartPreview';
import { ChordChartViewer } from './ChordChartViewer';
import type { CompositionShape, UploadedChart } from '../../routes/compos/compos-page.core';
import { selectChordProSource } from '../../routes/compos/compos-page.core';
import type { TaskShape } from '../../routes/tasks/tasks-page.core';

export interface CompositionDetailProps {
  readonly composition: CompositionShape;
  readonly uploadedChart: UploadedChart | null;
  readonly signedChartUrl: string | null;
  readonly chartErrorMessage: string | null;
  readonly members: readonly LineupMember[];
  readonly instruments: readonly LineupInstrument[];
  readonly tasks: readonly TaskShape[];
  readonly dueLabelOf: (task: TaskShape) => string | null;
  readonly isOverdue: (task: TaskShape) => boolean;
  readonly onToggleTaskDone: (task: TaskShape) => void;
  readonly onOpenTask: (task: TaskShape) => void;
  readonly onDeleteTask: (task: TaskShape) => void;
}

const SECTION_LABEL_CLASS = 'text-xs tracking-wider uppercase text-ink-400 font-medium';

// @FollowsBlueprint organism-presentational
export function CompositionDetail(props: CompositionDetailProps): JSX.Element {
  const { t } = useTranslation();
  const { composition } = props;
  const chordProSource = selectChordProSource(composition.chart);
  const hasNotes = selectSongNoteSections(composition).length > 0;

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display italic text-3xl text-ink-900 m-0">{composition.title}</h2>
        <StatusChip status={composition.status} />
        <Link
          to={`/catalog/${composition.id}`}
          className="ml-auto text-[13px] text-accent no-underline"
        >
          {t('compos.openInCatalog')}
        </Link>
      </div>

      <Card className="flex flex-col gap-2">
        <span className={SECTION_LABEL_CLASS}>{t('compos.lineup')}</span>
        <MemberLineup
          lineup={composition.defaultLineup}
          members={props.members}
          instruments={props.instruments}
        />
        <Link to={`/catalog/${composition.id}`} className="text-[13px] text-accent no-underline">
          {t('compos.editLineup')}
        </Link>
      </Card>

      <Card className="flex flex-col gap-2">
        <span className={SECTION_LABEL_CLASS}>{t('compos.notes')}</span>
        <SongNotes song={composition} />
        {hasNotes ? null : <HintText tone="muted">{t('compos.noNotes')}</HintText>}
      </Card>

      <Card className="flex flex-col gap-2">
        <span className={SECTION_LABEL_CLASS}>{t('compos.chart')}</span>
        {chordProSource === null ? null : <ChordChartViewer source={chordProSource} compact />}
        {props.uploadedChart !== null && (
          <UploadedChartPreview
            kind={props.uploadedChart.kind}
            objectKey={props.uploadedChart.s3Key}
            signedPreviewUrl={props.signedChartUrl}
            errorMessage={props.chartErrorMessage}
          />
        )}
        {composition.chart === null ? (
          <HintText tone="muted">{t('compos.noChart')}</HintText>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-2">
        <span className={SECTION_LABEL_CLASS}>{t('compos.tasks')}</span>
        {props.tasks.length === 0 ? (
          <HintText tone="muted">{t('compos.noTasks')}</HintText>
        ) : (
          <ul className="flex flex-col gap-1.5 list-none p-0 m-0" aria-label={t('compos.tasks')}>
            {props.tasks.map((task) => (
              <TaskRow
                key={task.id}
                title={task.title}
                status={task.status}
                dueLabel={props.dueLabelOf(task)}
                isOverdue={props.isOverdue(task)}
                songTitle={null}
                onToggleDone={() => props.onToggleTaskDone(task)}
                onOpen={() => props.onOpenTask(task)}
                onDelete={() => props.onDeleteTask(task)}
              />
            ))}
          </ul>
        )}
        <Link to="/tasks" className="self-start text-[13px] text-accent no-underline">
          {t('compos.addTaskLink')}
        </Link>
      </Card>
    </div>
  );
}
