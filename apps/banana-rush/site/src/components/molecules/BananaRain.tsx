import { buildBananaRain, createSeededDraw } from '@site/lib/banana-rain.utils';
import { BananaIcon } from '../atoms/BananaIcon';

const BANANA_COUNT = 14;
const RAIN_SEED = 20_260_920;

const BANANA_DROPS = buildBananaRain(BANANA_COUNT, createSeededDraw(RAIN_SEED));

/**
 * @Blueprint molecule-decorative-overlay
 * @BlueprintName Molecule Decorative Overlay
 * @BlueprintUsage Use for an animation that plays over a screen it must not push around, resize or make scrollable.
 * @BlueprintDescription Fills its positioned parent rather than the viewport, so the overlay is clipped by the band it decorates and can never add a scrollbar the way a fixed layer would; it takes no pointer events, so every control underneath stays reachable. The per-item variation is inline `style`, because the class names Tailwind ships are fixed strings and a name built at runtime is a class that was never generated; the figures behind that style come from a pure module taking its randomness as an argument, which is what lets the arrangement be asserted in a test. The whole layer drops out under `prefers-reduced-motion`, since the alternative is a set of bananas frozen wherever the shortened animation left them.
 */
export function BananaRain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
    >
      {BANANA_DROPS.map((drop) => (
        <span
          key={drop.leftPercent}
          className="absolute top-0 block animate-banana-fall"
          style={{
            left: `${String(drop.leftPercent)}%`,
            animationDuration: `${String(drop.fallSeconds)}s`,
            animationDelay: `${String(drop.fallDelaySeconds)}s`,
          }}
        >
          <span
            className="block animate-banana-spin"
            style={{
              width: `${String(drop.sizePixels)}px`,
              height: `${String(drop.sizePixels)}px`,
              animationDuration: `${String(drop.spinSeconds)}s`,
              animationDirection: drop.spinDirection,
            }}
          >
            <BananaIcon className="h-full w-full" />
          </span>
        </span>
      ))}
    </div>
  );
}
