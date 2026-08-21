import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, type Mock, vi } from 'vitest';
import type { AnimationMode } from '../../art/mondrian/animation.core';
import { CUSTOM_DEFAULTS, PALETTES, type PaletteKey } from '../../art/mondrian/palettes.utils';
import { i18next } from '../../i18n/i18n';
import { StudioRail } from './StudioRail';

interface RailSpies {
  onPaletteKeyChange: Mock<(nextPaletteKey: PaletteKey) => void>;
  onAnimationModeChange: Mock<(nextMode: AnimationMode) => void>;
}

function renderRail(): RailSpies {
  const spies: RailSpies = {
    onPaletteKeyChange: vi.fn<(nextPaletteKey: PaletteKey) => void>(),
    onAnimationModeChange: vi.fn<(nextMode: AnimationMode) => void>(),
  };
  render(
    <StudioRail
      isRailOpen={true}
      complexity={22}
      lineWeight={6}
      balance={0.5}
      paletteKey="classic"
      palette={PALETTES.classic}
      customColors={CUSTOM_DEFAULTS}
      animationMode="still"
      onComplexityChange={vi.fn()}
      onLineWeightChange={vi.fn()}
      onBalanceChange={vi.fn()}
      onPaletteKeyChange={spies.onPaletteKeyChange}
      onCustomColorChange={vi.fn()}
      onAnimationModeChange={spies.onAnimationModeChange}
      onCompose={vi.fn()}
      onDownload={vi.fn()}
    />,
  );
  return spies;
}

// @FollowsBlueprint test-component-render
describe('StudioRail', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('fr');
  });

  it('reports the palette the reader picks, which is what repaints the page', async () => {
    const spies = renderRail();
    await userEvent.click(screen.getByRole('button', { name: 'Nocturne' }));
    expect(spies.onPaletteKeyChange).toHaveBeenCalledWith('nocturne');
  });

  it('reports the animation mode the reader picks, which is what starts the cascade', async () => {
    const spies = renderRail();
    await userEvent.click(screen.getByRole('button', { name: 'Cascade' }));
    expect(spies.onAnimationModeChange).toHaveBeenCalledWith('cascade');
  });

  it('marks the palette in use as pressed', () => {
    renderRail();
    expect(screen.getByRole('button', { name: 'Classique' })).toHaveProperty('ariaPressed', 'true');
  });

  it('names every slider so it can be reached by label', () => {
    renderRail();
    expect(screen.getByLabelText('Complexité')).toBeDefined();
    expect(screen.getByLabelText('Épaisseur du trait')).toBeDefined();
    expect(screen.getByLabelText('Équilibre des couleurs')).toBeDefined();
  });
});
