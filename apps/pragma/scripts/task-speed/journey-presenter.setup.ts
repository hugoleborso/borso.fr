import type { Page } from 'playwright';

const OVERLAY_ID = 'task-speed-overlay';
const TAP_MARK_ID = 'task-speed-tap';
const TITLE_CARD_MS = 1800;
const CAPTION_LEAD_MS = 700;
const TAP_MARK_MS = 450;
const SUMMARY_MS = 2600;
const TYPING_DELAY_MS = 60;
const TAP_MARK_RADIUS_PX = 22;
const TAP_MARK_LIFETIME_FACTOR = 2;

export interface JourneyPresenter {
  readonly typingDelayMs: number;
  readonly showTitleCard: (title: string, subtitle: string) => Promise<void>;
  readonly showStep: (label: string, centreX: number, centreY: number) => Promise<void>;
  readonly showSummary: (lines: readonly string[]) => Promise<void>;
}

interface OverlayContent {
  readonly overlayId: string;
  readonly isFullScreen: boolean;
  readonly heading: string;
  readonly lines: readonly string[];
}

async function paintOverlay(page: Page, content: OverlayContent): Promise<void> {
  await page.evaluate((overlay) => {
    document.getElementById(overlay.overlayId)?.remove();
    const panel = document.createElement('div');
    panel.id = overlay.overlayId;
    panel.style.cssText = overlay.isFullScreen
      ? 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:12px;padding:24px;background:rgba(20,16,12,0.92);color:#fff;font:600 22px system-ui;text-align:center'
      : 'position:fixed;left:8px;right:8px;top:8px;z-index:2147483647;pointer-events:none;padding:8px 12px;border-radius:10px;background:rgba(20,16,12,0.82);color:#fff;font:600 15px system-ui;text-align:center';
    const heading = document.createElement('div');
    heading.textContent = overlay.heading;
    panel.append(heading);
    for (const line of overlay.lines) {
      const row = document.createElement('div');
      row.textContent = line;
      row.style.cssText = 'font:400 16px system-ui;opacity:0.9';
      panel.append(row);
    }
    document.body.append(panel);
  }, content);
}

async function clearOverlay(page: Page): Promise<void> {
  await page.evaluate((overlayId) => document.getElementById(overlayId)?.remove(), OVERLAY_ID);
}

async function markTap(page: Page, centreX: number, centreY: number): Promise<void> {
  await page.evaluate(
    (mark) => {
      document.getElementById(mark.id)?.remove();
      const dot = document.createElement('div');
      dot.id = mark.id;
      dot.style.cssText = `position:fixed;left:${String(mark.x - mark.radius)}px;top:${String(mark.y - mark.radius)}px;width:44px;height:44px;border-radius:50%;border:4px solid #e0533a;background:rgba(224,83,58,0.25);z-index:2147483647;pointer-events:none`;
      document.body.append(dot);
      setTimeout(() => dot.remove(), mark.lifetimeMs);
    },
    {
      id: TAP_MARK_ID,
      x: centreX,
      y: centreY,
      radius: TAP_MARK_RADIUS_PX,
      lifetimeMs: TAP_MARK_MS * TAP_MARK_LIFETIME_FACTOR,
    },
  );
}

export function createJourneyPresenter(page: Page, stageLabel: string): JourneyPresenter {
  let stepNumber = 0;
  return {
    typingDelayMs: TYPING_DELAY_MS,
    showTitleCard: async (title, subtitle) => {
      await paintOverlay(page, {
        overlayId: OVERLAY_ID,
        isFullScreen: true,
        heading: `${stageLabel} · ${title}`,
        lines: [subtitle],
      });
      await page.waitForTimeout(TITLE_CARD_MS);
      await clearOverlay(page);
    },
    showStep: async (label, centreX, centreY) => {
      stepNumber += 1;
      await paintOverlay(page, {
        overlayId: OVERLAY_ID,
        isFullScreen: false,
        heading: `${String(stepNumber)}. ${label}`,
        lines: [],
      });
      await page.waitForTimeout(CAPTION_LEAD_MS);
      await markTap(page, centreX, centreY);
      await page.waitForTimeout(TAP_MARK_MS);
    },
    showSummary: async (lines) => {
      await page.waitForTimeout(CAPTION_LEAD_MS);
      await paintOverlay(page, {
        overlayId: OVERLAY_ID,
        isFullScreen: true,
        heading: stageLabel,
        lines,
      });
      await page.waitForTimeout(SUMMARY_MS);
    },
  };
}
