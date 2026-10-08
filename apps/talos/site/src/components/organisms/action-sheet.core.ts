import type { DiscussionSubjectKind } from '../../lib/discussion-subject.core';

const SUBJECT_KIND_LABEL_KEYS = {
  todo: 'discuss.kind.todo',
  focus: 'discuss.kind.focus',
  scan: 'discuss.kind.scan',
  relations: 'discuss.kind.relations',
  draft: 'discuss.kind.draft',
  review: 'discuss.kind.review',
  proposal: 'discuss.kind.proposal',
  journal: 'discuss.kind.journal',
  commitment: 'discuss.kind.commitment',
  page: 'discuss.kind.page',
  folder: 'discuss.kind.folder',
} as const satisfies Record<DiscussionSubjectKind, string>;

// @FollowsBlueprint core-view-intent
export function selectSubjectKindLabelKey(
  kind: DiscussionSubjectKind,
): (typeof SUBJECT_KIND_LABEL_KEYS)[DiscussionSubjectKind] {
  return SUBJECT_KIND_LABEL_KEYS[kind];
}

const REQUEST_SEPARATOR = '\n\n';

export function composeDiscussionText(context: string, request: string | undefined): string {
  return request === undefined ? context : `${context}${REQUEST_SEPARATOR}${request}`;
}
