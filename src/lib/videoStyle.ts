import type { BackgroundEffect, Palette, VideoTweaks } from '../types';

export const BACKGROUND_EFFECTS: {
  id: BackgroundEffect;
  name: string;
  description: string;
}[] = [
  {
    id: 'ambient',
    name: 'Ambient',
    description: 'Blurred artwork, soft color fields, fine film grain.',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Luminous color fields with a gentle, audio-reactive bloom.',
  },
  {
    id: 'grain',
    name: 'Grain',
    description: 'High-contrast film grain over a deep gradient.',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean gradient with no artwork haze and no grain.',
  },
];

export const DEFAULT_VIDEO_TWEAKS: VideoTweaks = {
  accent: '#c9f75a',
  accent2: '#8b5cf6',
  background: 'ambient',
  sensitivity: 1,
  smoothing: 0.3,
  height: 1,
};

export const VIDEO_TWEAKS_STORAGE_KEY = 'musviz:video';
export const VIDEO_TWEAK_RANGES = {
  sensitivity: { min: 0.1, max: 4, step: 0.01 },
  smoothing: { min: 0, max: 1, step: 0.01 },
  height: { min: 0.1, max: 3, step: 0.01 },
} as const;

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isBackgroundEffect(value: unknown): value is BackgroundEffect {
  return BACKGROUND_EFFECTS.some((effect) => effect.id === value);
}

function numberOr(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

export function readVideoTweaks(): VideoTweaks {
  try {
    const raw = localStorage.getItem(VIDEO_TWEAKS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_VIDEO_TWEAKS };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_VIDEO_TWEAKS };
    }
    const record = parsed as Record<string, unknown>;
    return {
      accent:
        typeof record.accent === 'string' && HEX_PATTERN.test(record.accent)
          ? record.accent.toLowerCase()
          : DEFAULT_VIDEO_TWEAKS.accent,
      accent2:
        typeof record.accent2 === 'string' && HEX_PATTERN.test(record.accent2)
          ? record.accent2.toLowerCase()
          : DEFAULT_VIDEO_TWEAKS.accent2,
      background: isBackgroundEffect(record.background)
        ? record.background
        : DEFAULT_VIDEO_TWEAKS.background,
      sensitivity: numberOr(
        record.sensitivity,
        DEFAULT_VIDEO_TWEAKS.sensitivity,
        VIDEO_TWEAK_RANGES.sensitivity.min,
        VIDEO_TWEAK_RANGES.sensitivity.max,
      ),
      smoothing: numberOr(
        record.smoothing,
        DEFAULT_VIDEO_TWEAKS.smoothing,
        VIDEO_TWEAK_RANGES.smoothing.min,
        VIDEO_TWEAK_RANGES.smoothing.max,
      ),
      height: numberOr(
        record.height,
        DEFAULT_VIDEO_TWEAKS.height,
        VIDEO_TWEAK_RANGES.height.min,
        VIDEO_TWEAK_RANGES.height.max,
      ),
    };
  } catch {
    return { ...DEFAULT_VIDEO_TWEAKS };
  }
}

export function persistVideoTweaks(tweaks: VideoTweaks): void {
  try {
    localStorage.setItem(VIDEO_TWEAKS_STORAGE_KEY, JSON.stringify(tweaks));
  } catch {
    // Storage can be disabled; the in-memory look still applies.
  }
}

/**
 * The video has its own fixed dark base palette. Only the two signature colors come from
 * the user, so swapping the studio UI theme (Light, Latte, Mocha...) never changes the export.
 */
export function createVideoPalette(tweaks: Pick<VideoTweaks, 'accent' | 'accent2'>): Palette {
  return {
    mode: 'dark',
    bg: '#0a0a0c',
    surface: '#16161d',
    fg: '#f7f7f8',
    muted: '#b8b8c4',
    border: '#2b2b34',
    accent: tweaks.accent,
    accent2: tweaks.accent2,
  };
}
