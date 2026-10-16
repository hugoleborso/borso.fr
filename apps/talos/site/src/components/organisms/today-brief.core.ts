const LINE_BREAK = '\n';

export interface BriefPreview {
  readonly markdown: string;
  readonly isShortened: boolean;
}

// @FollowsBlueprint core-view-projection
export function selectBriefPreview(markdown: string, lineCount: number): BriefPreview {
  const lines = markdown.split(LINE_BREAK).filter((line) => line.trim() !== '');
  return {
    markdown: lines.slice(0, lineCount).join(LINE_BREAK),
    isShortened: lines.length > lineCount,
  };
}
