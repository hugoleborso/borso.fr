import { computeLowerBound, computeUpperBound } from '@domain/graph.core';
import { listWikilinkTargets } from '@domain/markdown-page.core';
import { addDaysToDate } from '../helpers/calendar/paris-clock.utils';
import { isMemorySlug } from './memory-text.core';

export interface MemoryIssue {
  readonly code: string;
  readonly slug: string;
  readonly message: string;
}

export interface LintEntity {
  readonly slug: string;
  readonly body: string;
  readonly closeness: number | null;
  readonly archived: boolean;
}

export interface LintRelation {
  readonly id: string;
  readonly fromSlug: string;
  readonly verb: string;
  readonly toSlug: string;
  readonly since: string | null;
  readonly until: string | null;
  readonly seen: string | null;
}

export interface LintCommitment {
  readonly slug: string;
  readonly status: string;
  readonly due: string | null;
}

export interface LintTodo {
  readonly id: string;
  readonly done: boolean;
  readonly removed: boolean;
  readonly commitmentSlug: string | null;
}

export interface LintInput {
  readonly entities: readonly LintEntity[];
  readonly relations: readonly LintRelation[];
  readonly verbs: readonly string[];
  readonly commitments: readonly LintCommitment[];
  readonly todos: readonly LintTodo[];
  readonly knownSlugs: readonly string[];
}

const STALE_AFTER_DAYS = 180;
const OPEN_STATUS = 'ouvert';
const DONE_STATUS = 'fait';

function listEntityIssues(input: LintInput, known: ReadonlySet<string>): MemoryIssue[] {
  const linked = new Set(input.entities.flatMap((entity) => listWikilinkTargets(entity.body)));
  const related = new Set(
    input.relations.flatMap((relation) => [relation.fromSlug, relation.toSlug]),
  );
  return input.entities.flatMap((entity) =>
    entity.archived
      ? []
      : [
          ...(entity.closeness === null
            ? [{ code: 'missing-closeness', slug: entity.slug, message: 'proximite absente' }]
            : []),
          ...listWikilinkTargets(entity.body)
            .filter((target) => !known.has(target))
            .map((target) => ({
              code: 'broken-link',
              slug: entity.slug,
              message: `[[${target}]] introuvable`,
            })),
          ...(!related.has(entity.slug) && !linked.has(entity.slug)
            ? [
                {
                  code: 'orphan-page',
                  slug: entity.slug,
                  message: 'aucune relation ni lien entrant',
                },
              ]
            : []),
        ],
  );
}

function listRelationIssues(
  input: LintInput,
  known: ReadonlySet<string>,
  today: string,
): MemoryIssue[] {
  const verbs = new Set(input.verbs);
  const staleBefore = addDaysToDate(today, -STALE_AFTER_DAYS);
  return input.relations.flatMap((relation) => {
    const label = `${relation.verb} → ${relation.toSlug}`;
    return [
      ...(verbs.has(relation.verb)
        ? []
        : [
            {
              code: 'unknown-verb',
              slug: relation.fromSlug,
              message: `verbe inconnu : ${relation.verb}`,
            },
          ]),
      ...(isMemorySlug(relation.toSlug) && !known.has(relation.toSlug)
        ? [
            {
              code: 'broken-link',
              slug: relation.fromSlug,
              message: `${label} : cible introuvable`,
            },
          ]
        : []),
      ...(relation.since !== null &&
      relation.until !== null &&
      computeLowerBound(relation.since) > computeUpperBound(relation.until)
        ? [
            {
              code: 'since-after-until',
              slug: relation.fromSlug,
              message: `${label} : depuis après jusqu'à`,
            },
          ]
        : []),
      ...(relation.until === null &&
      relation.seen !== null &&
      computeUpperBound(relation.seen) < staleBefore
        ? [
            {
              code: 'stale-relation',
              slug: relation.fromSlug,
              message: `${label} : vu le ${relation.seen}`,
            },
          ]
        : []),
    ];
  });
}

function isOverdue(commitment: LintCommitment, today: string): boolean {
  // Stryker disable next-line ConditionalExpression,LogicalOperator: equivalent mutant, a missing due date compares as never earlier than today.
  if (commitment.status !== OPEN_STATUS || commitment.due === null) return false;
  return commitment.due < today;
}

function listCommitmentIssues(input: LintInput, today: string): MemoryIssue[] {
  const statusBySlug = new Map(
    input.commitments.map((commitment) => [commitment.slug, commitment.status]),
  );
  const overdue = input.commitments
    .filter((commitment) => isOverdue(commitment, today))
    .map((commitment) => ({
      code: 'overdue-commitment',
      slug: commitment.slug,
      message: `échéance dépassée : ${String(commitment.due)}`,
    }));
  const mismatched = input.todos.flatMap((todo) => {
    // Stryker disable next-line ConditionalExpression: equivalent mutant, a todo without a commitment finds no status and is never reported.
    if (todo.removed || todo.commitmentSlug === null) return [];
    const status = statusBySlug.get(todo.commitmentSlug);
    const isMismatched =
      (todo.done && status === OPEN_STATUS) || (!todo.done && status === DONE_STATUS);
    if (!isMismatched) return [];
    const todoState = todo.done ? 'faite' : 'ouverte';
    const commitmentState = todo.done ? 'ouvert' : 'fait';
    return [
      {
        code: 'todo-commitment-mismatch',
        slug: todo.commitmentSlug,
        message: `todo ${todo.id} ${todoState}, engagement ${commitmentState}`,
      },
    ];
  });
  return [...overdue, ...mismatched];
}

// @FollowsBlueprint core-projection
export function listMemoryIssues(input: LintInput, today: string): MemoryIssue[] {
  const known = new Set(input.knownSlugs);
  return [
    ...listEntityIssues(input, known),
    ...listRelationIssues(input, known, today),
    ...listCommitmentIssues(input, today),
  ];
}
