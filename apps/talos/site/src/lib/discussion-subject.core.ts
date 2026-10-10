export type DiscussionSubjectReference =
  | { readonly kind: 'todo' }
  | { readonly kind: 'todos' }
  | { readonly kind: 'focus' }
  | { readonly kind: 'scan' }
  | { readonly kind: 'relations' }
  | { readonly kind: 'proposal' | 'draft'; readonly slug: string }
  | { readonly kind: 'review'; readonly week: string }
  | { readonly kind: 'journal'; readonly date: string }
  | { readonly kind: 'commitment' | 'page'; readonly path: string }
  | { readonly kind: 'folder'; readonly path: string };

export type DiscussionSubjectKind = DiscussionSubjectReference['kind'];

const MARKDOWN_EXTENSION = '.md';
const FIXED_FILES = {
  todo: 'todo.md',
  todos: 'todo.md',
  focus: 'focus.md',
  scan: 'etat/dernier-scan.json',
  relations: 'etat/relations.json',
} as const;

// @FollowsBlueprint core-view-intent
export function selectSubjectFile(subject: DiscussionSubjectReference): string {
  switch (subject.kind) {
    case 'todo':
    case 'todos':
    case 'focus':
    case 'scan':
    case 'relations':
      return FIXED_FILES[subject.kind];
    case 'proposal':
      return `etat/propositions/${subject.slug}${MARKDOWN_EXTENSION}`;
    case 'draft':
      return `etat/brouillons/${subject.slug}${MARKDOWN_EXTENSION}`;
    case 'review':
      return `journal/${subject.week}-hebdo${MARKDOWN_EXTENSION}`;
    case 'journal':
      return `journal/${subject.date}${MARKDOWN_EXTENSION}`;
    case 'folder':
      return `${subject.path}/`;
    case 'commitment':
    case 'page':
      return `${subject.path}${MARKDOWN_EXTENSION}`;
  }
}
