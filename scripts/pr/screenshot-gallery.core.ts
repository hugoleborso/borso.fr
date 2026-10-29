export interface StoredObject {
  readonly key: string;
  readonly lastModified: string;
}

export interface Screenshot {
  readonly file: string;
  readonly lastModified: string;
}

export interface ScreenshotFolder {
  readonly path: string;
  readonly newest: string;
  readonly screenshots: readonly Screenshot[];
  readonly recordings: readonly Screenshot[];
}

export interface BeforeAfterPair {
  readonly subject: string;
  readonly before: Screenshot;
  readonly after: Screenshot;
}

export interface FolderLayout {
  readonly pairs: readonly BeforeAfterPair[];
  readonly singles: readonly Screenshot[];
}

export interface GalleryRequest {
  readonly pullRequestNumber: number;
  readonly objects: readonly StoredObject[];
  readonly imageLimit: number;
}

export const DEFAULT_IMAGE_LIMIT = 30;
export const IMAGES_PER_ROW = 2;
export const GALLERY_HEADING = '### Screenshots';

const IMAGE_EXTENSIONS = ['.png', '.gif'];
const ANIMATION_EXTENSION = '.gif';
const RECORDING_EXTENSIONS = ['.webm', '.mp4'];
const EXTENSION_SEPARATOR = '.';
const ANIMATION_MARKER = ' (animated)';
const RECORDINGS_INTRODUCTION =
  'Recordings, which GitHub does not play inline; each link opens the file:';
const BEFORE_PREFIX = 'before-';
const AFTER_PREFIX = 'after-';
const PATH_SEPARATOR = '/';
const ROOT_FOLDER_LABEL = '(top level)';
const MARKDOWN_SPECIAL_CHARACTERS = /[\\[\]|*_`<>]/g;

export function screenshotPrefix(pullRequestNumber: number): string {
  return `screenshots/pr-${String(pullRequestNumber)}/`;
}

export function galleryHost(pullRequestNumber: number): string {
  return `https://screenshots-pr-${String(pullRequestNumber)}.preview.borso.fr`;
}

export function escapeMarkdown(text: string): string {
  return text.replace(MARKDOWN_SPECIAL_CHARACTERS, (character) => `\\${character}`);
}

function encodePath(path: string): string {
  return path.split(PATH_SEPARATOR).map(encodeURIComponent).join(PATH_SEPARATOR);
}

export function folderUrl(pullRequestNumber: number, folderPath: string): string {
  const host = galleryHost(pullRequestNumber);
  return folderPath === '' ? `${host}/` : `${host}/${encodePath(folderPath)}/`;
}

export function screenshotUrl(pullRequestNumber: number, folderPath: string, file: string): string {
  return `${folderUrl(pullRequestNumber, folderPath)}${encodeURIComponent(file)}`;
}

function splitKey(relativeKey: string): { readonly folder: string; readonly file: string } {
  const lastSeparator = relativeKey.lastIndexOf(PATH_SEPARATOR);
  return {
    folder: relativeKey.slice(0, Math.max(lastSeparator, 0)),
    file: relativeKey.slice(lastSeparator + 1),
  };
}

type MediaKind = 'screenshots' | 'recordings';

function mediaKind(key: string): MediaKind | undefined {
  if (IMAGE_EXTENSIONS.some((extension) => key.endsWith(extension))) return 'screenshots';
  if (RECORDING_EXTENSIONS.some((extension) => key.endsWith(extension))) return 'recordings';
  return undefined;
}

function fileStem(file: string): string {
  return file.slice(0, file.lastIndexOf(EXTENSION_SEPARATOR));
}

function byFileName(left: Screenshot, right: Screenshot): number {
  return left.file.localeCompare(right.file);
}

function newestOf(files: readonly Screenshot[]): string {
  return files.reduce(
    (latest, file) =>
      // Stryker disable next-line EqualityOperator: equivalent mutant, on equal strings both branches return the same value
      file.lastModified > latest ? file.lastModified : latest,
    '',
  );
}

function newestFolderFirst(left: ScreenshotFolder, right: ScreenshotFolder): number {
  return right.newest.localeCompare(left.newest) || right.path.localeCompare(left.path);
}

export function groupIntoFolders(
  objects: readonly StoredObject[],
  prefix: string,
): readonly ScreenshotFolder[] {
  const byFolder = new Map<string, Record<MediaKind, Screenshot[]>>();
  for (const object of objects) {
    const kind = mediaKind(object.key);
    if (!object.key.startsWith(prefix) || kind === undefined) continue;
    const { folder, file } = splitKey(object.key.slice(prefix.length));
    const media = byFolder.get(folder) ?? { screenshots: [], recordings: [] };
    media[kind].push({ file, lastModified: object.lastModified });
    byFolder.set(folder, media);
  }
  return [...byFolder.entries()]
    .map(([path, media]) => ({
      path,
      newest: newestOf([...media.screenshots, ...media.recordings]),
      screenshots: [...media.screenshots].sort(byFileName),
      recordings: [...media.recordings].sort(byFileName),
    }))
    .sort(newestFolderFirst);
}

function subjectAfterPrefix(file: string, prefix: string): string {
  return fileStem(file).slice(prefix.length);
}

export function layOutFolder(screenshots: readonly Screenshot[]): FolderLayout {
  const afters = new Map(
    screenshots
      .filter((screenshot) => screenshot.file.startsWith(AFTER_PREFIX))
      .map((screenshot) => [subjectAfterPrefix(screenshot.file, AFTER_PREFIX), screenshot]),
  );
  const pairs: BeforeAfterPair[] = [];
  const paired = new Set<string>();
  for (const before of screenshots) {
    if (!before.file.startsWith(BEFORE_PREFIX)) continue;
    const subject = subjectAfterPrefix(before.file, BEFORE_PREFIX);
    const after = afters.get(subject);
    if (after === undefined) continue;
    pairs.push({ subject, before, after });
    paired.add(before.file);
    paired.add(after.file);
  }
  return {
    pairs,
    singles: screenshots.filter((screenshot) => !paired.has(screenshot.file)),
  };
}

function imageCell(pullRequestNumber: number, folderPath: string, screenshot: Screenshot): string {
  const label = escapeMarkdown(fileStem(screenshot.file));
  const url = screenshotUrl(pullRequestNumber, folderPath, screenshot.file);
  const marker = screenshot.file.endsWith(ANIMATION_EXTENSION) ? ANIMATION_MARKER : '';
  return `![${label}](${url})<br><sub>${label}${marker}</sub>`;
}

function tableRow(cells: readonly string[]): string {
  return `| ${cells.join(' | ')} |`;
}

function chunk<Item>(items: readonly Item[], size: number): readonly (readonly Item[])[] {
  const rows: Item[][] = [];
  for (let start = 0; start < items.length; start += size) {
    rows.push(items.slice(start, start + size));
  }
  return rows;
}

function renderPairs(
  pullRequestNumber: number,
  folderPath: string,
  pairs: readonly BeforeAfterPair[],
): readonly string[] {
  if (pairs.length === 0) return [];
  return [
    tableRow(['Before', 'After']),
    tableRow(['---', '---']),
    ...pairs.map((pair) =>
      tableRow([
        imageCell(pullRequestNumber, folderPath, pair.before),
        imageCell(pullRequestNumber, folderPath, pair.after),
      ]),
    ),
    '',
  ];
}

function renderSingles(
  pullRequestNumber: number,
  folderPath: string,
  singles: readonly Screenshot[],
): readonly string[] {
  if (singles.length === 0) return [];
  const blankHeader = Array.from({ length: IMAGES_PER_ROW }, () => ' ');
  return [
    tableRow(blankHeader),
    tableRow(Array.from({ length: IMAGES_PER_ROW }, () => '---')),
    ...chunk(singles, IMAGES_PER_ROW).map((row) =>
      tableRow([
        ...row.map((screenshot) => imageCell(pullRequestNumber, folderPath, screenshot)),
        ...blankHeader.slice(row.length),
      ]),
    ),
    '',
  ];
}

function renderRecordings(
  pullRequestNumber: number,
  folderPath: string,
  recordings: readonly Screenshot[],
): readonly string[] {
  if (recordings.length === 0) return [];
  return [
    RECORDINGS_INTRODUCTION,
    '',
    ...recordings.map(
      (recording) =>
        `- [${escapeMarkdown(recording.file)}](${screenshotUrl(pullRequestNumber, folderPath, recording.file)})`,
    ),
    '',
  ];
}

function describeMedia(shown: number, images: number, recordings: number): string {
  const imageCount =
    shown === images ? plural(images, 'image') : `${String(shown)} of ${plural(images, 'image')}`;
  return recordings === 0 ? imageCount : `${imageCount} and ${plural(recordings, 'recording')}`;
}

interface FolderBudget {
  readonly layout: FolderLayout;
  readonly shown: number;
  readonly total: number;
}

export function fitFolderToBudget(layout: FolderLayout, budget: number): FolderBudget {
  const total = layout.pairs.length * 2 + layout.singles.length;
  const pairs = layout.pairs.slice(0, Math.floor(Math.max(budget, 0) / 2));
  const singles = layout.singles.slice(0, Math.max(budget - pairs.length * 2, 0));
  return {
    layout: { pairs, singles },
    shown: pairs.length * 2 + singles.length,
    total,
  };
}

function folderLabel(path: string): string {
  return path === '' ? ROOT_FOLDER_LABEL : escapeMarkdown(path);
}

function plural(count: number, noun: string): string {
  return `${String(count)} ${noun}${count === 1 ? '' : 's'}`;
}

export function renderEmptyGallery(pullRequestNumber: number): string {
  return [
    GALLERY_HEADING,
    '',
    `No screenshots are published under \`${screenshotPrefix(pullRequestNumber)}\` any more. The previews bucket deletes them 60 days after upload.`,
  ].join('\n');
}

export function renderGallery(request: GalleryRequest): string {
  const { pullRequestNumber, imageLimit } = request;
  const folders = groupIntoFolders(request.objects, screenshotPrefix(pullRequestNumber));
  if (folders.length === 0) return renderEmptyGallery(pullRequestNumber);

  const sections: string[] = [];
  const dropped: string[] = [];
  let remaining = imageLimit;
  let shownTotal = 0;
  let imageTotal = 0;
  let recordingTotal = 0;

  for (const folder of folders) {
    const fitted = fitFolderToBudget(layOutFolder(folder.screenshots), remaining);
    remaining -= fitted.shown;
    shownTotal += fitted.shown;
    imageTotal += fitted.total;
    recordingTotal += folder.recordings.length;
    const link = `[${folderLabel(folder.path)}](${folderUrl(pullRequestNumber, folder.path)})`;
    if (fitted.shown < fitted.total) {
      dropped.push(`- ${link}: ${String(fitted.shown)} of ${String(fitted.total)} shown`);
    }
    if (fitted.shown === 0 && folder.recordings.length === 0) continue;
    sections.push(
      `#### ${link}`,
      '',
      ...renderPairs(pullRequestNumber, folder.path, fitted.layout.pairs),
      ...renderSingles(pullRequestNumber, folder.path, fitted.layout.singles),
      ...renderRecordings(pullRequestNumber, folder.path, folder.recordings),
    );
  }

  const summary = `<sub>${describeMedia(shownTotal, imageTotal, recordingTotal)} from ${plural(folders.length, 'folder')}, newest folder first. The previews bucket deletes them 60 days after upload.</sub>`;
  const droppedSection =
    dropped.length === 0
      ? []
      : [
          `**Not shown here**, to keep the comment readable: ${plural(imageTotal - shownTotal, 'image')} past the first ${String(imageLimit)}. Each folder link opens the full set.`,
          '',
          ...dropped,
        ];

  return [GALLERY_HEADING, '', summary, '', ...sections, ...droppedSection].join('\n').trimEnd();
}
