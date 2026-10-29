import { z } from 'zod';
import type { BandSessionDriver } from './band-session.setup';
import { READ_ADD_SONGS_SHEET, READ_ORDER_SCREEN } from './page-probes.setup';
import { TaskWalk, waitMilliseconds } from './walk-recorder.setup';

const ROUTE_SETTLE_MS = 900;
const SHEET_SETTLE_MS = 700;
const PRESS_SHEET_CHIP = `(name) => { const chip = [...document.querySelectorAll('dialog[open] [aria-pressed]')].find((element) => element.innerText.trim() === name); if (chip) chip.click(); return chip !== undefined; }`;
const ADD_SONGS_CHIPS = ['Not in this setlist', 'Concert ready', 'Rehearsed', 'To learn', 'Ideas'];

const sheetSchema = z
  .object({
    confirmCentreFraction: z.number().nullable(),
    rows: z.number(),
    rowsInSetlist: z.number(),
    rowsInSetlistPickable: z.number(),
  })
  .nullable();

async function measureOrderScreen(driver: BandSessionDriver): Promise<unknown> {
  await driver.startFresh((records) => `/setlists/${records.main.id}/order`);
  await waitMilliseconds(ROUTE_SETTLE_MS);
  return await driver.session.evaluate(READ_ORDER_SCREEN);
}

async function measureAddSongsSheet(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  const known = await driver.startFresh((records) => `/setlists/${records.main.id}`);
  const setlistTitles = (await driver.listEntries(known.main.id)).map((entry) => entry.title);
  const walk = new TaskWalk(driver.session, 'Add songs sheet');
  await walk.tap('Add songs', { exact: 'Add songs', css: 'button', scope: 'page' });
  await waitMilliseconds(SHEET_SETTLE_MS);
  const byChip: Record<string, z.infer<typeof sheetSchema>> = {};
  for (const chip of ADD_SONGS_CHIPS) {
    await driver.session.evaluate(PRESS_SHEET_CHIP, chip);
    await waitMilliseconds(SHEET_SETTLE_MS);
    byChip[chip] = sheetSchema.parse(
      await driver.session.evaluate(READ_ADD_SONGS_SHEET, setlistTitles),
    );
  }
  const chipViews = Object.values(byChip);
  return {
    byChip,
    confirmCentreFraction: byChip[ADD_SONGS_CHIPS[0] ?? '']?.confirmCentreFraction ?? null,
    songsAlreadyInOfferedAgain: chipViews.reduce(
      (total, view) => total + (view?.rowsInSetlistPickable ?? 0),
      0,
    ),
  };
}

export async function measureSliceFour(
  driver: BandSessionDriver,
): Promise<Record<string, unknown>> {
  return {
    orderScreen: await measureOrderScreen(driver),
    addSongsSheet: await measureAddSongsSheet(driver),
  };
}
