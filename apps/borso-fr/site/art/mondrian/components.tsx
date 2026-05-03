import type { ReactNode } from 'react';
import type { Palette } from './palettes.utils';
import type { ColoredRect } from './painting.utils';
import { useAnimation, type AnimationMode } from './use-animation';

const INKBLOOM_STAGGER_TOTAL_MS = 600;
const INKBLOOM_RANDOM_JITTER_MS = 80;
const INKBLOOM_DURATION_MS = 700;
const INKBLOOM_REDUCED_DURATION_MS = 180;

type AnnouncerProps = { message: string };

export function Announcer({ message }: AnnouncerProps) {
  return (
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  children: ReactNode;
};

export function Field({ label, value, children }: FieldProps) {
  return (
    <div className="field">
      <div className="field-head">
        <span className="field-name">{label}</span>
        <span className="field-value">{value}</span>
      </div>
      {children}
    </div>
  );
}

type ReadOnlySwatchProps = { color: string; name: string };

export function ReadOnlySwatch({ color, name }: ReadOnlySwatchProps) {
  return <span className="swatch" style={{ background: color }} title={name} />;
}

type EditableSwatchProps = {
  color: string;
  name: string;
  onColorChange: (nextHex: string) => void;
};

export function EditableSwatch({ color, name, onColorChange }: EditableSwatchProps) {
  return (
    <label className="swatch editable" style={{ background: color }} title={`Click to change ${name}`}>
      <span className="name">{name}</span>
      <input
        type="color"
        value={color}
        onChange={(event) => onColorChange(event.target.value)}
        aria-label={`Edit ${name}`}
      />
    </label>
  );
}

type SegmentsProps<Value extends string> = {
  options: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (nextValue: Value) => void;
  layout?: 'four' | 'five';
  legend: string;
};

export function Segments<Value extends string>({
  options,
  value,
  onChange,
  layout,
  legend,
}: SegmentsProps<Value>) {
  const layoutClass = layout === 'four' ? ' four' : layout === 'five' ? ' five' : '';
  return (
    <fieldset className={`segments${layoutClass}`}>
      <legend className="visually-hidden">{legend}</legend>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={`seg${value === option.value ? ' on' : ''}`}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

type MondrianFrameProps = {
  rects: ColoredRect[];
  palette: Palette;
  lineWeight: number;
  drawKey: string;
  animationMode: AnimationMode;
  reducedMotion: boolean;
  onCompose: () => void;
};

export function MondrianFrame({
  rects,
  palette,
  lineWeight,
  drawKey,
  animationMode,
  reducedMotion,
  onCompose,
}: MondrianFrameProps) {
  const setCanvasNode = useAnimation(animationMode, reducedMotion);
  const animationName = reducedMotion ? 'inkbloom-reduced' : 'inkbloom';
  const animationDurationMs = reducedMotion ? INKBLOOM_REDUCED_DURATION_MS : INKBLOOM_DURATION_MS;

  return (
    <button
      type="button"
      className="frame"
      style={{ background: palette.bg }}
      onClick={onCompose}
      aria-label="Composition. Click to recompose."
    >
      <div className="canvas" ref={setCanvasNode}>
        {rects.map((rectangle, rectIndex) => {
          const animationDelayMs = reducedMotion
            ? 0
            : (rectIndex / rects.length) * INKBLOOM_STAGGER_TOTAL_MS +
              Math.random() * INKBLOOM_RANDOM_JITTER_MS;
          return (
            <div
              key={`${drawKey}-${rectangle.id}`}
              className="rect"
              style={{
                left: `${rectangle.x * 100}%`,
                top: `${rectangle.y * 100}%`,
                width: `${rectangle.width * 100}%`,
                height: `${rectangle.height * 100}%`,
                background: rectangle.fill,
                outline: `${lineWeight}px solid ${palette.line}`,
                outlineOffset: `-${lineWeight / 2}px`,
                animation: `${animationName} ${animationDurationMs}ms cubic-bezier(.2,.7,.2,1) both`,
                animationDelay: `${animationDelayMs}ms`,
              }}
            />
          );
        })}
      </div>
    </button>
  );
}
