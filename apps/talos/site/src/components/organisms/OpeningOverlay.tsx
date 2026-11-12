import { type AnimationEvent, type CSSProperties, type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hideDockTarget, measureDockTarget, readViewport } from '../../lib/opening.adapter';
import {
  computeDockMove,
  type DockMove,
  isDockAimingAnimation,
  isLandingAnimation,
  SHRINK_IN_PLACE,
} from '../../lib/opening.core';
import { SpinningCoin } from '../atoms/SpinningCoin';

const HALO_STYLE: CSSProperties = {
  background:
    'radial-gradient(circle, rgba(214, 150, 80, 0.35), rgba(120, 70, 30, 0.12) 40%, transparent 68%)',
};
const NIGHT_STYLE: CSSProperties = {
  maskImage:
    'radial-gradient(circle at 50% 42%, transparent var(--opening-hole), #000 var(--opening-hole))',
};

// @FollowsBlueprint molecule-decorative-overlay
export function OpeningOverlay(): JSX.Element | null {
  const { t } = useTranslation();
  const [isOver, setIsOver] = useState(false);
  const [dockMove, setDockMove] = useState<DockMove>(SHRINK_IN_PLACE);
  if (isOver) return null;

  function finish(): void {
    hideDockTarget(false);
    setIsOver(true);
  }

  function aimAtDock(event: AnimationEvent): void {
    const isAiming = isDockAimingAnimation(event.animationName);
    if (!isAiming) return;
    hideDockTarget(true);
    setDockMove(computeDockMove(measureDockTarget(), readViewport()));
  }

  function finishOnLanding(event: AnimationEvent): void {
    const hasLanded = isLandingAnimation(event.animationName);
    if (hasLanded) finish();
  }

  return (
    <div
      aria-hidden="true"
      data-testid="opening"
      className="fixed inset-0 z-50 overflow-hidden motion-reduce:hidden"
      onPointerDown={finish}
      onAnimationStart={aimAtDock}
      onAnimationEnd={finishOnLanding}
    >
      <div
        className="absolute inset-0 bg-opening-night animate-opening-reveal"
        style={NIGHT_STYLE}
      />
      <div
        className="absolute left-1/2 top-[42%] size-[420px] -ml-[210px] -mt-[210px] rounded-full animate-opening-halo"
        style={HALO_STYLE}
      />
      <div className="absolute inset-0 perspective-opening animate-opening-coin-wrap">
        <SpinningCoin dockX={dockMove.x} dockY={dockMove.y} dockScale={dockMove.scale} />
      </div>
      <p className="absolute inset-x-0 top-[calc(42%+98px)] m-0 pl-[0.34em] text-center font-engraved text-engraved text-opening-word animate-opening-word">
        {t('opening.word')}
      </p>
    </div>
  );
}
