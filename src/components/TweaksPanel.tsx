import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BACKGROUND_EFFECTS, DEFAULT_VIDEO_TWEAKS, VIDEO_TWEAK_RANGES } from '../lib/videoStyle';
import type { BackgroundEffect, VideoTweaks } from '../types';
import { IconChevron } from './Icons';

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="color-field">
        <input
          id={id}
          className="color-input"
          type="color"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <span className="color-hex">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

function formatTweak(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function normalizedTweak(raw: string, min: number, max: number, step: number): number | null {
  const text = raw.trim().replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
    return null;
  }
  const parsed = Number(text);
  const snapped = Math.round(parsed / step) * step;
  return Math.min(max, Math.max(min, Number(snapped.toFixed(2))));
}

function TweakControl({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => formatTweak(value));
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) {
      setDraft(formatTweak(value));
    }
  }, [value]);

  const update = (raw: string) => {
    setDraft(raw);
    const parsed = normalizedTweak(raw, min, max, step);
    if (parsed !== null) {
      onChange(parsed);
    }
  };

  const commit = (raw: string) => {
    const next = normalizedTweak(raw, min, max, step);
    if (next === null) {
      setDraft(formatTweak(value));
      return;
    }
    onChange(next);
    setDraft(formatTweak(next));
  };

  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-field">
      <div className="slider-head">
        <label htmlFor={id}>{label}</label>
        <span className="tweak-value">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            aria-describedby="tweak-value-hint"
            onFocus={() => {
              editing.current = true;
            }}
            onChange={(event) => update(event.currentTarget.value)}
            onBlur={(event) => {
              editing.current = false;
              commit(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
          {unit ? <span aria-hidden="true">{unit}</span> : null}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={`${label} slider`}
        style={{ '--fill': `${percent}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </div>
  );
}

export function TweaksPanel({
  value,
  onChange,
}: {
  value: VideoTweaks;
  onChange: (value: VideoTweaks) => void;
}) {
  const effect = BACKGROUND_EFFECTS.find((item) => item.id === value.background);
  const update = <K extends keyof VideoTweaks>(key: K, next: VideoTweaks[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <section className="panel" aria-labelledby="tweaks-panel-title">
      <div className="panel-head">
        <div className="panel-heading">
          <span className="panel-step">04</span>
          <h2 className="panel-title" id="tweaks-panel-title">
            Video tweaks
          </h2>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => onChange({ ...DEFAULT_VIDEO_TWEAKS })}
        >
          Reset
        </button>
      </div>

      <div className="field-grid">
        <ColorField
          id="video-accent"
          label="Accent"
          value={value.accent}
          onChange={(accent) => update('accent', accent)}
        />
        <ColorField
          id="video-gradient"
          label="Gradient"
          value={value.accent2}
          onChange={(accent2) => update('accent2', accent2)}
        />
      </div>

      <div className="field tweak-stack">
        <label className="field-label" htmlFor="video-background">
          Background
        </label>
        <div className="select">
          <select
            id="video-background"
            value={value.background}
            onChange={(event) =>
              update('background', event.currentTarget.value as BackgroundEffect)
            }
          >
            {BACKGROUND_EFFECTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <IconChevron size={14} />
        </div>
        <p className="panel-hint">{effect?.description}</p>
      </div>

      <div className="tweak-stack">
        <TweakControl
          id="video-sensitivity"
          label="Sensitivity"
          value={value.sensitivity}
          min={VIDEO_TWEAK_RANGES.sensitivity.min}
          max={VIDEO_TWEAK_RANGES.sensitivity.max}
          step={VIDEO_TWEAK_RANGES.sensitivity.step}
          unit="×"
          onChange={(sensitivity) => update('sensitivity', sensitivity)}
        />
        <TweakControl
          id="video-smoothing"
          label="Smoothing"
          value={value.smoothing}
          min={VIDEO_TWEAK_RANGES.smoothing.min}
          max={VIDEO_TWEAK_RANGES.smoothing.max}
          step={VIDEO_TWEAK_RANGES.smoothing.step}
          onChange={(smoothing) => update('smoothing', smoothing)}
        />
        <TweakControl
          id="video-height"
          label="Visualizer height"
          value={value.height}
          min={VIDEO_TWEAK_RANGES.height.min}
          max={VIDEO_TWEAK_RANGES.height.max}
          step={VIDEO_TWEAK_RANGES.height.step}
          unit="×"
          onChange={(height) => update('height', height)}
        />
      </div>

      <p className="panel-hint" id="tweak-value-hint" style={{ marginTop: 10 }}>
        Type an exact value or drag the slider. Sensitivity is 0.1–4×, height is 0.1–3×, and
        smoothing blends from 0 (raw) to 1 (fully smoothed).
      </p>

      <p className="panel-hint" style={{ marginTop: 12 }}>
        Video colors and effects are independent from the studio theme. Changing the UI theme never
        changes your export.
      </p>
    </section>
  );
}
