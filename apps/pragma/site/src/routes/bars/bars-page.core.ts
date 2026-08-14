/**
 * Decisions the bars page makes: which kanban column a bar belongs to,
 * which write a submitted form means, and which form the page should
 * show after a row is selected or deleted.
 */

import {
  type BarFormInitial,
  type BarFormSubmitPayload,
  type BarStatus,
  buildBarFormInitial,
} from './bar-form.core';

export interface BarRow {
  readonly id: string;
  readonly name: string;
  readonly status: BarStatus;
  readonly notes: string;
  readonly city: string | null;
  readonly capacity: number | null;
  readonly contactName: string | null;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly lastInteractionAt: string | null;
}

export type BarsView = 'list' | 'kanban';

export type ToggleState = 'active' | 'inactive';

export function selectToggleState(current: BarsView, candidate: BarsView): ToggleState {
  return current === candidate ? 'active' : 'inactive';
}

export function groupBarsByStatus(bars: readonly BarRow[]): Record<BarStatus, BarRow[]> {
  const grouped: Record<BarStatus, BarRow[]> = {
    lead: [],
    contacted: [],
    booked: [],
    played: [],
    cold: [],
  };
  for (const bar of bars) grouped[bar.status].push(bar);
  return grouped;
}

export interface KanbanCard {
  readonly id: string;
  readonly name: string;
  readonly city: string | null;
  readonly capacity: number | null;
  readonly contactName: string | null;
  readonly isStale: boolean;
}

/**
 * The kanban board reads a bar as a card, and staleness is the only field it
 * derives rather than copies. Projecting here keeps the board free of the
 * clock the staleness check needs.
 */
export function buildKanbanCardsByStatus(
  barsByStatus: Readonly<Record<BarStatus, readonly BarRow[]>>,
  isBarStale: (bar: BarRow) => boolean,
): Record<BarStatus, KanbanCard[]> {
  const toCards = (bars: readonly BarRow[]): KanbanCard[] =>
    bars.map((bar) => ({
      id: bar.id,
      name: bar.name,
      city: bar.city,
      capacity: bar.capacity,
      contactName: bar.contactName,
      isStale: isBarStale(bar),
    }));
  return {
    lead: toCards(barsByStatus.lead),
    contacted: toCards(barsByStatus.contacted),
    booked: toCards(barsByStatus.booked),
    played: toCards(barsByStatus.played),
    cold: toCards(barsByStatus.cold),
  };
}

export function sortBarsByName(bars: readonly BarRow[]): BarRow[] {
  return bars.toSorted((left, right) => left.name.localeCompare(right.name));
}

export type BarWriteIntent =
  | { readonly kind: 'skip' }
  | { readonly kind: 'create'; readonly payload: BarFormSubmitPayload }
  | { readonly kind: 'update'; readonly payload: BarFormSubmitPayload & { readonly id: string } };

/**
 * A blank name means the operator submitted an untouched form, which is
 * not a write. Otherwise the presence of an identifier decides between
 * an insert and an update.
 *
 * @Blueprint core-view-intent
 * @BlueprintName Core View Intent
 * @BlueprintUsage Use for a decision a route makes about what to do next, so the component holds no condition.
 * @BlueprintDescription Returns a discriminated union naming what the submission means, and `applyBarWriteIntent` below dispatches that union to a visitor whose branches the page supplies, so the page reads as three named callbacks rather than a chain of ifs over a nullable identifier. The decision is pure, which is what lets a test state the rule directly instead of rendering the form.
 */
export function selectBarWriteIntent(
  id: string | null,
  payload: BarFormSubmitPayload,
): BarWriteIntent {
  if (payload.name.length === 0) return { kind: 'skip' };
  if (id === null) return { kind: 'create', payload };
  return { kind: 'update', payload: { ...payload, id } };
}

export interface BarWriteVisitor<Result> {
  readonly skip: () => Result;
  readonly create: (payload: BarFormSubmitPayload) => Result;
  readonly update: (payload: BarFormSubmitPayload & { readonly id: string }) => Result;
}

/** Dispatches an intent to the matching visitor branch, so the caller holds no condition. */
export function applyBarWriteIntent<Result>(
  intent: BarWriteIntent,
  visitor: BarWriteVisitor<Result>,
): Result {
  if (intent.kind === 'skip') return visitor.skip();
  if (intent.kind === 'create') return visitor.create(intent.payload);
  return visitor.update(intent.payload);
}

export type DragDropIntent = 'ignore' | 'move';

/** An empty drag payload means the drop came from outside the kanban. */
export function selectDragDropIntent(draggedBarId: string): DragDropIntent {
  return draggedBarId.length === 0 ? 'ignore' : 'move';
}

/** Selecting an unknown identifier leaves the form untouched. */
export function selectFormForBar(
  bars: readonly BarRow[],
  barId: string,
  current: BarFormInitial,
): BarFormInitial {
  const bar = bars.find((candidate) => candidate.id === barId);
  return bar === undefined ? current : buildBarFormInitial(bar);
}

/** Deleting the bar the form is editing resets the form; any other deletion does not. */
export function selectFormAfterDeletion(
  current: BarFormInitial,
  deletedBarId: string,
  blank: BarFormInitial,
): BarFormInitial {
  return current.id === deletedBarId ? blank : current;
}

/**
 * The React key of the bar form.
 *
 * Selecting another bar remounts the form, which is how the fields pick up the
 * new values. Creating one used to leave the key at its blank value, so the
 * form kept everything just submitted and a second tap on Save wrote a
 * duplicate record. The counter the page bumps on every successful write is
 * what makes the blank form a different form from the one that produced it.
 */
export function buildBarFormKey(initial: BarFormInitial, writeCount: number): string {
  return `${initial.id ?? 'new'}-${writeCount}`;
}

/**
 * Which of the two panels the page actually shows.
 *
 * The kanban board moves cards with HTML5 drag and drop, and touch input never
 * fires those events, so on a phone the board renders a reordering affordance
 * no finger can use — and five empty 480px columns to scroll past. The list,
 * whose form carries a status field, is the path that works by touch.
 */
export function selectVisibleBarsView(chosen: BarsView, isNarrow: boolean): BarsView {
  return isNarrow ? 'list' : chosen;
}
