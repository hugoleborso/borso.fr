import type { DiscussionSubjectKind } from '../../lib/discussion-subject.core';

const SUBJECT_PHRASE_KEYS = {
  todo: 'discuss.subject.todo',
  todos: 'discuss.subject.todos',
  focus: 'discuss.subject.focus',
  scan: 'discuss.subject.scan',
  relations: 'discuss.subject.relations',
  draft: 'discuss.subject.draft',
  review: 'discuss.subject.review',
  proposal: 'discuss.subject.proposal',
  journal: 'discuss.subject.journal',
  commitment: 'discuss.subject.commitment',
  page: 'discuss.subject.page',
  folder: 'discuss.subject.folder',
} as const satisfies Record<DiscussionSubjectKind, string>;

// @FollowsBlueprint core-view-intent
export function selectSubjectPhraseKey(
  kind: DiscussionSubjectKind,
): (typeof SUBJECT_PHRASE_KEYS)[DiscussionSubjectKind] {
  return SUBJECT_PHRASE_KEYS[kind];
}

const REQUEST_SEPARATOR = '\n\n';

export function composeDiscussionText(context: string, request: string | undefined): string {
  return request === undefined ? context : `${context}${REQUEST_SEPARATOR}${request}`;
}
