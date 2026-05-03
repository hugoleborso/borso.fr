import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PAGE_URL = 'http://localhost:5173/art/mondrian/?seed=DEADBEEF&palette=classic';
const OUTPUT_DIR = fileURLToPath(new URL('../.screenshots', import.meta.url));
const INKBLOOM_SETTLE_MS = 900;

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 720, height: 1024 },
  { name: 'phone', width: 380, height: 800 },
];

async function takeScreenshots() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(INKBLOOM_SETTLE_MS);
      const path = `${OUTPUT_DIR}/${viewport.name}-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({ path, fullPage: false });
      console.log(`saved ${path}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch((error) => {
  console.error(error);
  process.exit(1);
});
