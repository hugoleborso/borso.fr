import { afterEach, describe, expect, it, vi } from 'vitest';
import { handler } from './main.export';

const exportArchive = vi.hoisted(() => ({ archiveExport: vi.fn() }));

vi.mock('./backups/export-archive.adapter', () => exportArchive);

function captureWrittenLines() {
  return vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
}

function readWrittenEvents(write: ReturnType<typeof captureWrittenLines>): unknown[] {
  return write.mock.calls.map(([line]) => {
    const writtenEvent: unknown = JSON.parse(String(line));
    return writtenEvent;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  exportArchive.archiveExport.mockReset();
});

describe('the export job handler', () => {
  it('runs the weekly export inside one scheduled wide event', async () => {
    const write = captureWrittenLines();
    const archived = { objectKey: 'exports/2026-11-08.json', exportedAt: 'now', tables: 3 };
    exportArchive.archiveExport.mockResolvedValueOnce(archived);

    expect(await handler()).toBe(archived);

    expect(readWrittenEvents(write)).toMatchObject([
      {
        'service.name': 'talos-api',
        'event.kind': 'scheduled',
        'scheduled.job': 'export',
        outcome: 'success',
      },
    ]);
  });

  it('records the failure of an export that threw and throws it on', async () => {
    const write = captureWrittenLines();
    const failure = new Error('the export answered 503');
    exportArchive.archiveExport.mockRejectedValueOnce(failure);

    await expect(handler()).rejects.toBe(failure);

    expect(readWrittenEvents(write)).toMatchObject([
      { 'scheduled.job': 'export', outcome: 'failed', 'error.message': 'the export answered 503' },
    ]);
  });
});
