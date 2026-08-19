/**
 * Which markdown links name a file in this repository, and which do not.
 *
 * Every rule in `docs/standards/` is enforced by something that reads the tree,
 * and the documents doing the explaining were the one part nothing read. A link
 * rots silently: the target moves, the prose still points at the old path, and
 * the next reader concludes the document is stale rather than the link.
 *
 * The work here is deciding what is *not* a repository path, because a link
 * checker that flags a template's placeholder is a checker somebody switches
 * off.
 */

const LINK_PATTERN = /\]\(([^)\s]+?)(?:#[^)\s]*)?\)/g;

const FENCE_PATTERN = /^\s*(?:```|~~~)/;

/**
 * The line numbers sitting inside a fenced block.
 *
 * Markdown does not render a link inside a fence, and the fences here hold the
 * report skeletons the validator agents write. Those links resolve from
 * `docs/features/<app>/<slug>/validation/`, where the artefact lands, and are
 * meant to be broken where they sit. Reading them was this checker's own first
 * defect: it reported eight, every one correct in the file it produces.
 *
 * Collected as line numbers rather than by blanking the text, because a blanked
 * copy has to put *something* in each fenced line and any string that is not a
 * link does the job — which makes the choice of string unobservable, and an
 * unobservable choice is a mutant no test can kill.
 */
function buildFencedLineNumbers(markdown: string): ReadonlySet<number> {
  const fenced = new Set<number>();
  let isInFence = false;
  markdown.split('\n').forEach((line, index) => {
    if (FENCE_PATTERN.test(line)) isInFence = !isInFence;
    if (isInFence) fenced.add(index + 1);
  });
  return fenced;
}

const ABSOLUTE_SCHEMES = ['http://', 'https://', 'mailto:', 'ftp://'];

/**
 * A placeholder stands for a path the reader supplies, so the file it names is
 * not supposed to exist. `NNNN` is the ADR numbering convention, and the rest
 * are the bracket styles the templates here use.
 */
const PLACEHOLDER_PATTERN = /[{}<>…]|NNNN/;

/**
 * GitHub renders a link relative to the repository, not to the file, so
 * `../../commit/<sha>` reaches a commit page rather than a directory. Nothing
 * on disk can satisfy one and nothing should try.
 */
const GITHUB_RELATIVE_PATTERN =
  /(?:^|\/)(?:commit|commits|pull|issues|compare|releases|tree|blob)\//;

/**
 * A target with no separator and no extension is prose, e.g. the literal `url`
 * that a template writes where the author will paste one.
 */
function isProse(target: string): boolean {
  return !target.includes('/') && !target.includes('.');
}

export type SkipReason = 'absolute' | 'anchor' | 'placeholder' | 'github-relative' | 'not-a-path';

export interface DocumentLink {
  readonly target: string;
  /** The line the link sits on, so a failure can be opened straight from it. */
  readonly line: number;
}

/**
 * Collected through `replace` rather than `matchAll`, because a replacer's
 * captured group arrives as a `string` while an indexed match arrives as
 * `string | undefined`. The `?? ''` that closes the gap is a branch no input
 * can take, and the coverage gate is right to ask for one.
 */
export function listLinks(markdown: string): readonly DocumentLink[] {
  const fenced = buildFencedLineNumbers(markdown);
  const links: DocumentLink[] = [];
  let line = 1;
  let consumed = 0;
  markdown.replace(LINK_PATTERN, (whole: string, target: string, offset: number) => {
    line += countNewlines(markdown.slice(consumed, offset));
    consumed = offset;
    if (!fenced.has(line)) links.push({ target, line });
    return whole;
  });
  return links;
}

function countNewlines(text: string): number {
  return text.split('\n').length - 1;
}

/** Why this link is not checked against the tree, or `null` when it is. */
export function readSkipReason(target: string): SkipReason | null {
  if (ABSOLUTE_SCHEMES.some((scheme) => target.startsWith(scheme))) return 'absolute';
  if (target.startsWith('#')) return 'anchor';
  if (PLACEHOLDER_PATTERN.test(target)) return 'placeholder';
  if (GITHUB_RELATIVE_PATTERN.test(target)) return 'github-relative';
  if (isProse(target)) return 'not-a-path';
  return null;
}

export interface BrokenLink {
  readonly document: string;
  readonly line: number;
  readonly target: string;
}

export interface DocumentUnderCheck {
  readonly path: string;
  readonly markdown: string;
}

/**
 * The broken links in one document.
 *
 * `isPresent` answers whether a target reached from this document's directory
 * exists, which is the only part that has to touch a disk.
 */
export function listBrokenLinks(
  document: DocumentUnderCheck,
  isPresent: (documentPath: string, target: string) => boolean,
): readonly BrokenLink[] {
  const broken: BrokenLink[] = [];
  for (const link of listLinks(document.markdown)) {
    if (readSkipReason(link.target) !== null) continue;
    if (isPresent(document.path, link.target)) continue;
    broken.push({ document: document.path, line: link.line, target: link.target });
  }
  return broken;
}
