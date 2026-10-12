export interface SplitText {
  readonly head: string;
  readonly rest: readonly string[];
}

export function readCapture(match: RegExpExecArray, groupName: string): string {
  return match.groups?.[groupName] ?? '';
}

export function splitHeadFromRest(text: string, separator: string): SplitText {
  const separatorIndex = text.indexOf(separator);
  if (separatorIndex === -1) return { head: text, rest: [] };
  return {
    head: text.slice(0, separatorIndex),
    rest: text.slice(separatorIndex + separator.length).split(separator),
  };
}
