import { useCallback, useEffect, useMemo, useState } from 'react';
import { Announcer, EditableSwatch, Field, MondrianFrame, ReadOnlySwatch, Segments } from './components';
import { downloadCompositionPng } from './download';
import { isComposeKeyEvent } from './keyboard.utils';
import { applyPaperTheme } from './palette-theme';
import {
  buildCustomPalette,
  CUSTOM_DEFAULTS,
  PALETTES,
  type CustomColors,
  type PaletteKey,
} from './palettes.utils';
import { colorize, generateLayout } from './painting.utils';
import { buildTitle } from './titles.utils';
import { isAnimationMode, type AnimationMode } from './use-animation';
import { buildSearch, freshSeed, readUrlState, seedToHex } from './url-state.utils';

const CASCADE_INTERVAL_MS = 5500;

const DEFAULT_COMPLEXITY = 22;
const DEFAULT_LINE_WEIGHT = 6;
const DEFAULT_BALANCE = 0.5;

const COMPLEXITY_MIN = 6;
const COMPLEXITY_MAX = 60;
const LINE_WEIGHT_MIN = 1;
const LINE_WEIGHT_MAX = 14;
const BALANCE_STEP = 0.01;

const PALETTE_OPTIONS: readonly { value: PaletteKey; label: string }[] = [
  { value: 'classic', label: 'Classique' },
  { value: 'muted', label: 'Muted' },
  { value: 'nocturne', label: 'Nocturne' },
  { value: 'garden', label: 'Garden' },
  { value: 'custom', label: 'Custom' },
];

const ANIMATION_OPTIONS: readonly { value: AnimationMode; label: string }[] = [
  { value: 'still', label: 'Still' },
  { value: 'drift', label: 'Drift' },
  { value: 'breathe', label: 'Breathe' },
  { value: 'cascade', label: 'Cascade' },
];

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);
  return matches;
}

export function App() {
  const reducedMotion = usePrefersReducedMotion();

  const initialUrlState = useMemo(
    () => readUrlState(window.location.search, { paletteKey: 'classic' }),
    [],
  );

  const [paletteKey, setPaletteKey] = useState<PaletteKey>(initialUrlState.paletteKey);
  const [seed, setSeed] = useState<number>(initialUrlState.seed);
  const [customColors, setCustomColors] = useState<CustomColors>(CUSTOM_DEFAULTS);
  const [complexity, setComplexity] = useState(DEFAULT_COMPLEXITY);
  const [lineWeight, setLineWeight] = useState(DEFAULT_LINE_WEIGHT);
  const [balance, setBalance] = useState(DEFAULT_BALANCE);
  const [animationMode, setAnimationMode] = useState<AnimationMode>(
    reducedMotion ? 'still' : 'drift',
  );
  const [railOpen, setRailOpen] = useState(false);

  const palette = useMemo(
    () => (paletteKey === 'custom' ? buildCustomPalette(customColors) : PALETTES[paletteKey]),
    [paletteKey, customColors],
  );

  const layout = useMemo(() => generateLayout({ seed, complexity }), [seed, complexity]);
  const rects = useMemo(
    () => colorize(layout, { seed, palette, balance }),
    [layout, palette, seed, balance],
  );

  const drawKey = `${seed}-${complexity}`;

  useEffect(() => {
    applyPaperTheme(paletteKey);
  }, [paletteKey]);

  useEffect(() => {
    if (animationMode !== 'cascade') return;
    const intervalHandle = window.setInterval(() => {
      const nextSeed = freshSeed();
      setSeed(nextSeed);
      window.history.replaceState(
        { seed: nextSeed, paletteKey },
        '',
        buildSearch({ seed: nextSeed, paletteKey }),
      );
    }, CASCADE_INTERVAL_MS);
    return () => window.clearInterval(intervalHandle);
  }, [animationMode, paletteKey]);

  const compose = useCallback(() => {
    const nextSeed = freshSeed();
    setSeed(nextSeed);
    window.history.pushState(
      { seed: nextSeed, paletteKey },
      '',
      buildSearch({ seed: nextSeed, paletteKey }),
    );
  }, [paletteKey]);

  const changePalette = useCallback(
    (nextPaletteKey: PaletteKey) => {
      setPaletteKey(nextPaletteKey);
      window.history.replaceState(
        { seed, paletteKey: nextPaletteKey },
        '',
        buildSearch({ seed, paletteKey: nextPaletteKey }),
      );
    },
    [seed],
  );

  // On first paint, mirror the resolved state into the URL so a fresh visit (no
  // ?seed=) and an invalid-?seed= visit both end up with a shareable address bar.
  useEffect(() => {
    const { seed: initialSeed, paletteKey: initialPaletteKey } = initialUrlState;
    window.history.replaceState(
      { seed: initialSeed, paletteKey: initialPaletteKey },
      '',
      buildSearch({ seed: initialSeed, paletteKey: initialPaletteKey }),
    );
  }, [initialUrlState]);

  useEffect(() => {
    const onPopState = () => {
      const restored = readUrlState(window.location.search, { paletteKey: 'classic' });
      setSeed(restored.seed);
      setPaletteKey(restored.paletteKey);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!isComposeKeyEvent(event)) return;
      event.preventDefault();
      compose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [compose]);

  const download = useCallback(() => {
    downloadCompositionPng({ rects, palette, lineWeight, seed });
  }, [rects, palette, lineWeight, seed]);

  const title = useMemo(() => buildTitle(seed, rects, palette), [seed, rects, palette]);
  const workNumber = useMemo(() => `№ ${(seed % 9999).toString().padStart(4, '0')}`, [seed]);
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    [],
  );

  return (
    <div className="app">
      <button
        type="button"
        className="rail-toggle"
        onClick={() => setRailOpen((open) => !open)}
        aria-expanded={railOpen}
      >
        {railOpen ? 'Close' : 'Studio'}
      </button>

      <aside className={`rail${railOpen ? ' open' : ''}`} aria-label="Studio controls">
        <div className="brandmark">
          <span className="dot" aria-hidden="true" />
          <span>Borso&rsquo;s Atelier · Est. 1999</span>
        </div>
        <h1 className="title">
          <i>Mondrian</i>
          <span className="gen-tag">— Generator —</span>
        </h1>
        <p className="subtitle">
          A studio for composing in the manner of <i>De&nbsp;Stijl</i>: rectangles, primary colors,
          and the deliberate quiet between them.
        </p>

        <div className="rule strong" />

        <div className="section-label">Composition</div>

        <Field label="Complexity" value={`${Math.round(complexity)} fields`}>
          <input
            type="range"
            min={COMPLEXITY_MIN}
            max={COMPLEXITY_MAX}
            step={1}
            value={complexity}
            onChange={(event) => setComplexity(Number(event.target.value))}
            className="slider"
            aria-label="Complexity"
          />
        </Field>

        <Field label="Line weight" value={`${lineWeight} px`}>
          <input
            type="range"
            min={LINE_WEIGHT_MIN}
            max={LINE_WEIGHT_MAX}
            step={1}
            value={lineWeight}
            onChange={(event) => setLineWeight(Number(event.target.value))}
            className="slider"
            aria-label="Line weight"
          />
        </Field>

        <Field label="Color balance" value={`${Math.round(balance * 100)}%`}>
          <input
            type="range"
            min={0}
            max={1}
            step={BALANCE_STEP}
            value={balance}
            onChange={(event) => setBalance(Number(event.target.value))}
            className="slider"
            aria-label="Color balance"
          />
        </Field>

        <div className="rule" />

        <div className="section-label">Palette</div>
        <Segments
          layout="five"
          legend="Palette"
          value={paletteKey}
          onChange={changePalette}
          options={PALETTE_OPTIONS}
        />
        <div className="palette" style={{ marginTop: 18 }}>
          {paletteKey === 'custom' ? (
            <>
              <EditableSwatch
                color={customColors.customColor1}
                name="Color 1"
                onColorChange={(nextHex) =>
                  setCustomColors((previousColors) => ({ ...previousColors, customColor1: nextHex }))
                }
              />
              <EditableSwatch
                color={customColors.customColor2}
                name="Color 2"
                onColorChange={(nextHex) =>
                  setCustomColors((previousColors) => ({ ...previousColors, customColor2: nextHex }))
                }
              />
              <EditableSwatch
                color={customColors.customColor3}
                name="Color 3"
                onColorChange={(nextHex) =>
                  setCustomColors((previousColors) => ({ ...previousColors, customColor3: nextHex }))
                }
              />
              <EditableSwatch
                color={customColors.customPaper}
                name="Paper"
                onColorChange={(nextHex) =>
                  setCustomColors((previousColors) => ({ ...previousColors, customPaper: nextHex }))
                }
              />
              <EditableSwatch
                color={customColors.customInk}
                name="Ink"
                onColorChange={(nextHex) =>
                  setCustomColors((previousColors) => ({ ...previousColors, customInk: nextHex }))
                }
              />
            </>
          ) : (
            palette.fills
              .filter((fill, index, all) => all.findIndex((other) => other.hex === fill.hex) === index)
              .map((fill) => <ReadOnlySwatch key={fill.hex} color={fill.hex} name={fill.name} />)
          )}
        </div>

        <div className="rule" style={{ marginTop: 36 }} />

        <div className="section-label">Animation</div>
        <Segments
          layout="four"
          legend="Animation mode"
          value={animationMode}
          onChange={(candidateMode) => {
            if (isAnimationMode(candidateMode)) setAnimationMode(candidateMode);
          }}
          options={ANIMATION_OPTIONS}
        />

        <div className="btn-row">
          <button type="button" className="btn primary" onClick={compose}>
            Compose <span className="arrow">→</span>
          </button>
          <button type="button" className="btn ghost" onClick={download}>
            Download
          </button>
        </div>

        <p className="credit">
          <b>Studio note</b>
          Each composition is generated from a single seed.{' '}
          <span className="hint-fine">Press space to compose anew</span>
          <span className="hint-coarse">Tap the painting to compose anew</span>
          . Hold a palette to sit with it; switch to <i>Cascade</i> to let the room rearrange itself.
        </p>
      </aside>

      <main className="stage">
        <div className="stage-head">
          <div>
            <div className="work-no">Composition · {workNumber}</div>
            <h2 className="work-title">
              <i>{title}</i>
            </h2>
          </div>
          <div className="meta">
            {palette.label}
            <br />
            {Math.round(complexity)} fields · {todayLabel}
          </div>
        </div>

        <div className="frame-wrap">
          <MondrianFrame
            rects={rects}
            palette={palette}
            lineWeight={lineWeight}
            drawKey={drawKey}
            animationMode={animationMode}
            reducedMotion={reducedMotion}
            onCompose={compose}
          />
        </div>

        <button type="button" className="stage-compose" onClick={compose}>
          Compose <span className="arrow">→</span>
        </button>

        <div className="stage-foot">
          <span className="seed">Seed · {seedToHex(seed)}</span>
          <span className="hint-fine">
            <i>Press</i> <span className="kbd">space</span> <i>to compose</i>
          </span>
          <span className="hint-coarse">
            <i>Tap the painting to compose</i>
          </span>
        </div>
      </main>

      <Announcer message={title} />
    </div>
  );
}
