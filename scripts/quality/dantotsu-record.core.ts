export interface DantotsuDocument {
  readonly slug: string;
  readonly title: string;
  readonly fields: ReadonlyMap<string, string> | null;
  readonly body: string;
}

const FRONT_MATTER_PATTERN = /^---\n[\s\S]*?\n---\n?/;
const FIELD_LINE_PATTERN = /^[a-z][a-z-]*:/;
const FRONT_MATTER_DELIMITERS = /^---\n|\n---\n?$/g;
const TITLE_MARKER = /^#\s+/;
const TRAILING_COMMENT_PATTERN = /\s+#\s.*$/;
const TITLE_PATTERN = /^#\s+.+$/m;
const LIST_PATTERN = /^\[.*\]$/;
const NONE_WITH_REASON_PATTERN = /^none \((.+)\)$/;
const SURROUNDING_QUOTES_PATTERN = /^['"]|['"]$/g;

export function readDantotsuDocument(slug: string, markdown: string): DantotsuDocument {
  const frontMatter = FRONT_MATTER_PATTERN.exec(markdown);
  const body = frontMatter === null ? markdown : markdown.slice(frontMatter[0].length);
  const title = TITLE_PATTERN.exec(body)?.[0].replace(TITLE_MARKER, '').trim() ?? slug;
  if (frontMatter === null) return { slug, title, fields: null, body };
  const fields = new Map<string, string>();
  for (const line of frontMatter[0].replace(FRONT_MATTER_DELIMITERS, '').split('\n')) {
    if (!FIELD_LINE_PATTERN.test(line)) continue;
    const separator = line.indexOf(':');
    fields.set(
      line.slice(0, separator),
      line
        .slice(separator + 1)
        .trim()
        .replace(TRAILING_COMMENT_PATTERN, ''),
    );
  }
  return { slug, title, fields, body };
}

export function stripQuotes(value: string): string {
  return value.replace(SURROUNDING_QUOTES_PATTERN, '');
}

export function readListValue(value: string | undefined): readonly string[] | null {
  if (value === undefined) return null;
  const list = LIST_PATTERN.exec(value.trim());
  if (list === null) return null;
  return list[0]
    .slice(1, -1)
    .split(',')
    .map((entry) => stripQuotes(entry.trim()))
    .filter((entry) => entry.length > 0);
}

export function readNoneReason(value: string | undefined): string | null {
  if (value === undefined) return null;
  return NONE_WITH_REASON_PATTERN.exec(stripQuotes(value.trim()))?.[1] ?? null;
}

export function readField(document: DantotsuDocument, name: string): string | undefined {
  const value = document.fields?.get(name);
  return value === undefined || value.length === 0 ? undefined : value;
}
