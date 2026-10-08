export type DiscussionSubjectReference =
  | { readonly kind: 'todo' }
  | { readonly kind: 'focus' }
  | { readonly kind: 'scan' }
  | { readonly kind: 'proposal'; readonly slug: string }
  | { readonly kind: 'journal'; readonly date: string }
  | { readonly kind: 'commitment' | 'page'; readonly path: string }
  | { readonly kind: 'folder'; readonly path: string };

export type DiscussionSubjectKind = DiscussionSubjectReference['kind'];

const MARKDOWN_EXTENSION = '.md';
const FIXED_FILES = {
  todo: 'todo.md',
  focus: 'focus.md',
  scan: 'etat/dernier-scan.json',
} as const;

// @FollowsBlueprint core-view-intent
export function selectSubjectFile(subject: DiscussionSubjectReference): string {
  switch (subject.kind) {
    case 'todo':
    case 'focus':
    case 'scan':
      return FIXED_FILES[subject.kind];
    case 'proposal':
      return `etat/propositions/${subject.slug}${MARKDOWN_EXTENSION}`;
    case 'journal':
      return `journal/${subject.date}${MARKDOWN_EXTENSION}`;
    case 'folder':
      return `${subject.path}/`;
    case 'commitment':
    case 'page':
      return `${subject.path}${MARKDOWN_EXTENSION}`;
  }
}
