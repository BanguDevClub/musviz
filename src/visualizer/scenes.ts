import type { Palette } from '../types';
import { mix, rgba } from './color';
import { clamp, createConicGradient, type Render2D } from './primitives';
import type { SceneInput } from './types';

const TAU = Math.PI * 2;

function sampleSpectrum(spectrum: Float32Array, index: number, total: number): number {
  const position = (index / total) * spectrum.length;
  const from = Math.floor(position);
  const to = Math.min(spectrum.length - 1, from + 1);
  const fraction = position - from;
  return (spectrum[from] ?? 0) * (1 - fraction) + (spectrum[to] ?? 0) * fraction;
}

function drawCenterOrb(
  ctx: Render2D,
  x: number,
  y: number,
  radius: number,
  palette: Palette,
  bass: number,
  time: number,
): void {
  const pulse = 1 + bass * 0.5 + Math.sin(time * 1.8) * 0.03;
  const glowRadius = radius * 3.2 * pulse;

  const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
  glow.addColorStop(0, rgba(palette.accent, 0.26));
  glow.addColorStop(0.45, rgba(palette.accent, 0.08));
  glow.addColorStop(1, rgba(palette.accent, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, TAU);
  ctx.fill();

  ctx.fillStyle = rgba(palette.fg, 0.85);
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.16 * pulse, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = rgba(palette.accent, 0.65);
  ctx.lineWidth = Math.max(1, radius * 0.03);
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.5 * pulse, 0, TAU);
  ctx.stroke();
}

export function drawBars({ ctx, height, palette, layout, spectrum, bass }: SceneInput): void {
  const count = 64;
  const { left, right, base } = layout.bar;
  const usable = right - left;
  const slot = usable / count;
  const barWidth = slot * 0.58;
  const maxHeight = Math.min(layout.bar.maxHeight * layout.heightScale, base - height * 0.24);
  const minHeight = height * 0.0035;
  const pulse = 1 + bass * 0.06;

  const heights = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const value = Math.pow(sampleSpectrum(spectrum, index, count), 0.82);
    heights[index] = value < 0.03 ? 0 : minHeight + value * maxHeight * pulse;
  }

  // Mirrored reflection below the baseline.
  const reflection = ctx.createLinearGradient(0, base, 0, base + maxHeight * 0.34);
  reflection.addColorStop(0, rgba(palette.accent, 0.22));
  reflection.addColorStop(1, rgba(palette.accent, 0));
  ctx.beginPath();
  for (let index = 0; index < count; index += 1) {
    const barHeight = heights[index]! * 0.34;
    if (barHeight <= 0.2) {
      continue;
    }
    const x = left + index * slot + (slot - barWidth) / 2;
    const y = base + height * 0.004;
    ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
  }
  ctx.fillStyle = reflection;
  ctx.fill();

  ctx.beginPath();
  for (let index = 0; index < count; index += 1) {
    const barHeight = heights[index]!;
    if (barHeight <= 0.2) {
      continue;
    }
    const x = left + index * slot + (slot - barWidth) / 2;
    ctx.roundRect(x, base - barHeight, barWidth, barHeight, barWidth / 2);
  }

  ctx.save();
  ctx.shadowColor = rgba(palette.accent, 0.5);
  ctx.shadowBlur = height * 0.016;
  ctx.fillStyle = rgba(palette.accent, 0.2);
  ctx.fill();
  ctx.restore();

  const gradient = ctx.createLinearGradient(0, base, 0, base - maxHeight);
  gradient.addColorStop(0, palette.accent);
  gradient.addColorStop(0.55, mix(palette.accent, palette.accent2, 0.45));
  gradient.addColorStop(1, palette.accent2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Tiny peak caps for a more analogue, meter-like finish.
  ctx.strokeStyle = rgba(palette.fg, 0.38);
  ctx.lineWidth = Math.max(1, height * 0.0011);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let index = 0; index < count; index += 1) {
    const value = sampleSpectrum(spectrum, index, count);
    if (value < 0.12) {
      continue;
    }
    const x = left + index * slot + (slot - barWidth) / 2;
    const y = base - heights[index]! - height * 0.007;
    ctx.moveTo(x + barWidth * 0.24, y);
    ctx.lineTo(x + barWidth * 0.76, y);
  }
  ctx.stroke();

  const baseline = ctx.createLinearGradient(left, 0, right, 0);
  baseline.addColorStop(0, rgba(palette.accent, 0));
  baseline.addColorStop(0.5, rgba(palette.accent, 0.4));
  baseline.addColorStop(1, rgba(palette.accent, 0));
  ctx.strokeStyle = baseline;
  ctx.lineWidth = Math.max(1, height * 0.0014);
  ctx.beginPath();
  ctx.moveTo(left, base + height * 0.003);
  ctx.lineTo(right, base + height * 0.003);
  ctx.stroke();
}

function buildWavePath(
  ctx: Render2D,
  wave: Float32Array,
  left: number,
  right: number,
  center: number,
  amplitude: number,
  offset = 0,
): void {
  const points = wave.length - offset;
  ctx.beginPath();
  for (let index = 0; index < points; index += 1) {
    const sample = clamp(wave[index + offset] ?? 0, -1, 1);
    const x = left + (index / Math.max(1, points - 1)) * (right - left);
    const y = center + sample * amplitude;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
}

export function drawWave({ ctx, height, palette, layout, wave, bass, level }: SceneInput): void {
  const { left, right, center } = layout.wave;
  const amplitude = height * 0.098 * (0.6 + level * 0.55 + bass * 0.35) * layout.heightScale;

  const ribbon = ctx.createLinearGradient(0, center - amplitude, 0, center + amplitude);
  ribbon.addColorStop(0, rgba(palette.accent, 0));
  ribbon.addColorStop(0.5, rgba(palette.accent, 0.075));
  ribbon.addColorStop(1, rgba(palette.accent, 0));
  ctx.beginPath();
  for (let index = 0; index < wave.length; index += 1) {
    const sample = clamp(wave[index] ?? 0, -1, 1);
    const x = left + (index / Math.max(1, wave.length - 1)) * (right - left);
    const y = center + sample * amplitude;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  for (let index = wave.length - 1; index >= 0; index -= 1) {
    const sample = clamp(wave[index] ?? 0, -1, 1);
    const x = left + (index / Math.max(1, wave.length - 1)) * (right - left);
    ctx.lineTo(x, center - sample * amplitude * 0.55);
  }
  ctx.closePath();
  ctx.fillStyle = ribbon;
  ctx.fill();

  const guide = ctx.createLinearGradient(left, 0, right, 0);
  guide.addColorStop(0, rgba(palette.border, 0));
  guide.addColorStop(0.15, rgba(palette.border, 0.7));
  guide.addColorStop(0.85, rgba(palette.border, 0.7));
  guide.addColorStop(1, rgba(palette.border, 0));
  ctx.strokeStyle = guide;
  ctx.lineWidth = Math.max(1, height * 0.0015);
  ctx.beginPath();
  ctx.moveTo(left, center);
  ctx.lineTo(right, center);
  ctx.stroke();

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  buildWavePath(ctx, wave, left, right, center + height * 0.006, amplitude * 0.78, 18);
  ctx.strokeStyle = rgba(palette.accent2, 0.13);
  ctx.lineWidth = height * 0.014;
  ctx.stroke();

  buildWavePath(ctx, wave, left, right, center, amplitude);
  ctx.strokeStyle = rgba(palette.accent, 0.16);
  ctx.lineWidth = height * 0.006;
  ctx.stroke();

  const stroke = ctx.createLinearGradient(left, 0, right, 0);
  stroke.addColorStop(0, palette.accent2);
  stroke.addColorStop(0.5, palette.accent);
  stroke.addColorStop(1, palette.accent2);

  ctx.save();
  ctx.shadowColor = rgba(palette.accent, 0.55);
  ctx.shadowBlur = height * 0.012;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1.4, height * 0.0032);
  buildWavePath(ctx, wave, left, right, center, amplitude);
  ctx.stroke();
  ctx.restore();
}

function buildRadialTicks(
  ctx: Render2D,
  cx: number,
  cy: number,
  baseRadius: number,
  maxRadius: number,
  spectrum: Float32Array,
  rotation: number,
): void {
  const count = 64;
  const step = TAU / count;
  const span = Math.max(0.1, maxRadius - baseRadius);
  ctx.beginPath();
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + index * step + rotation;
    const value = sampleSpectrum(spectrum, index, count);
    const length = baseRadius + span * (0.08 + value * 0.92);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ctx.moveTo(cx + cos * baseRadius, cy + sin * baseRadius);
    ctx.lineTo(cx + cos * length, cy + sin * length);
  }
}

export function drawRadial({
  ctx,
  height,
  time,
  palette,
  layout,
  spectrum,
  bass,
}: SceneInput): void {
  const { x, y, radius } = layout.stage;
  const inner = radius + height * 0.012;
  const outer = inner + height * 0.14 * layout.heightScale;
  const rotation = time * 0.07 + bass * 0.12;
  const width = Math.max(2, ((TAU * inner) / 64) * 0.46);

  ctx.strokeStyle = rgba(palette.border, 0.55);
  ctx.lineWidth = Math.max(1, height * 0.0011);
  ctx.beginPath();
  ctx.arc(x, y, inner, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = rgba(palette.border, 0.3);
  ctx.beginPath();
  ctx.arc(x, y, outer, 0, TAU);
  ctx.stroke();

  ctx.lineCap = 'round';
  buildRadialTicks(ctx, x, y, inner + height * 0.006, outer - height * 0.005, spectrum, rotation);
  ctx.save();
  ctx.shadowColor = rgba(palette.accent, 0.6);
  ctx.shadowBlur = height * 0.018;
  ctx.strokeStyle = rgba(palette.accent, 0.2);
  ctx.lineWidth = width * 1.5;
  ctx.stroke();
  ctx.restore();

  const gradient =
    createConicGradient(ctx, rotation, x, y, [
      { offset: 0, color: palette.accent },
      { offset: 0.33, color: palette.accent2 },
      { offset: 0.66, color: palette.accent },
      { offset: 1, color: palette.accent },
    ]) ?? palette.accent;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = width;
  ctx.stroke();

  drawCenterOrb(ctx, x, y, height * 0.038, palette, bass, time);
}

function buildPolarPath(
  ctx: Render2D,
  wave: Float32Array,
  cx: number,
  cy: number,
  baseRadius: number,
  amplitude: number,
  rotation: number,
): void {
  const count = wave.length;
  ctx.beginPath();
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * TAU - Math.PI / 2 + rotation;
    const radius = baseRadius + (wave[index] ?? 0) * amplitude;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

export function drawHalo({
  ctx,
  height,
  time,
  palette,
  layout,
  spectrum,
  wave,
  bass,
}: SceneInput): void {
  const { x, y, radius } = layout.stage;
  const base = radius + height * 0.038;
  const amplitude = height * 0.042 * (0.55 + bass * 0.7) * layout.heightScale;
  const rotation = time * 0.012;

  ctx.strokeStyle = rgba(palette.border, 0.5);
  ctx.lineWidth = Math.max(1, height * 0.001);
  ctx.beginPath();
  ctx.arc(x, y, base - height * 0.02, 0, TAU);
  ctx.stroke();

  buildPolarPath(ctx, wave, x, y, base, amplitude * 0.6, rotation + Math.PI / 2);
  ctx.strokeStyle = rgba(palette.accent2, 0.28);
  ctx.lineWidth = Math.max(1, height * 0.0014);
  ctx.stroke();

  buildPolarPath(ctx, wave, x, y, base, amplitude, rotation);
  ctx.strokeStyle = rgba(palette.bg, 0.4);
  ctx.lineWidth = Math.max(2, height * 0.008);
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = rgba(palette.accent, 0.5);
  ctx.shadowBlur = height * 0.012;
  ctx.strokeStyle = rgba(palette.accent, 0.13);
  ctx.lineWidth = height * 0.005;
  ctx.stroke();
  ctx.restore();

  const ringGradient = ctx.createLinearGradient(x - base, y - base, x + base, y + base);
  ringGradient.addColorStop(0, palette.accent);
  ringGradient.addColorStop(0.45, mix(palette.accent, palette.fg, 0.35));
  ringGradient.addColorStop(1, palette.accent);
  ctx.strokeStyle = ringGradient;
  ctx.lineWidth = Math.max(1.4, height * 0.0028);
  buildPolarPath(ctx, wave, x, y, base, amplitude, rotation);
  ctx.stroke();

  ctx.fillStyle = rgba(palette.accent2, 0.8);
  for (let index = 0; index < 24; index += 1) {
    const angle = (index / 24) * TAU + time * 0.09;
    const value = sampleSpectrum(spectrum, index, 24);
    const dot = height * (0.0012 + value * 0.0032);
    const distance =
      base + height * 0.085 * layout.heightScale + value * height * 0.02 * layout.heightScale;
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, dot, 0, TAU);
    ctx.fill();
  }

  const coreGlow = ctx.createRadialGradient(x, y, 0, x, y, height * 0.045);
  coreGlow.addColorStop(0, rgba(palette.accent, 0.16));
  coreGlow.addColorStop(1, rgba(palette.accent, 0));
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(x, y, height * 0.045, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba(palette.fg, 0.8);
  ctx.beginPath();
  ctx.arc(x, y, height * 0.0045, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(palette.accent2, 0.5);
  ctx.lineWidth = Math.max(1, height * 0.0015);
  ctx.beginPath();
  ctx.arc(x, y, height * 0.018, 0, TAU);
  ctx.stroke();
}

export function drawOrbit({
  ctx,
  height,
  time,
  palette,
  layout,
  spectrum,
  bass,
}: SceneInput): void {
  const { x, y, radius } = layout.stage;
  const base = radius + height * 0.03;
  const count = 64;
  const rotation = time * 0.13;
  const points: { x: number; y: number; value: number }[] = [];

  for (let index = 0; index < count; index += 1) {
    const value = sampleSpectrum(spectrum, index, count);
    const angle =
      (index / count) * TAU - Math.PI / 2 + rotation + value * 0.18 + Math.sin(index * 1.7) * 0.015;
    const distance =
      base +
      value * height * 0.1 * layout.heightScale +
      Math.sin(time * 0.7 + index * 0.83) * height * 0.006;
    points.push({
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      value,
    });
  }

  ctx.strokeStyle = rgba(palette.border, 0.5);
  ctx.lineWidth = Math.max(1, height * 0.001);
  ctx.beginPath();
  ctx.arc(x, y, base, 0, TAU);
  ctx.stroke();

  const thread = ctx.createLinearGradient(x - base, y - base, x + base, y + base);
  thread.addColorStop(0, rgba(palette.accent2, 0.5));
  thread.addColorStop(0.5, rgba(palette.accent, 0.45));
  thread.addColorStop(1, rgba(palette.accent2, 0.5));
  ctx.strokeStyle = thread;
  ctx.lineWidth = Math.max(1, height * 0.0015);
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.closePath();
  ctx.stroke();

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!;
    const dot = height * (0.0018 + point.value * 0.0056);
    ctx.fillStyle = rgba(palette.accent, 0.07 + point.value * 0.09);
    ctx.beginPath();
    ctx.arc(point.x, point.y, dot * 2.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = index % 5 === 0 ? palette.accent2 : palette.accent;
    ctx.globalAlpha = 0.55 + point.value * 0.45;
    ctx.beginPath();
    ctx.arc(point.x, point.y, dot, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawCenterOrb(ctx, x, y, height * 0.042, palette, bass, time);
}
