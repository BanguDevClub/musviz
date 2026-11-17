import type { Palette, RenderConfig } from '../types';
import { SpectrumAnalyzer, SPECTRUM_BANDS, WAVE_POINTS } from '../lib/analysis';
import { VIDEO_TWEAK_RANGES } from '../lib/videoStyle';
import { mix, rgba } from './color';
import {
  addRoundRect,
  clamp,
  DISPLAY_FONT,
  drawImageCover,
  ellipsize,
  setLetterSpacing,
  wrapText,
  type Render2D,
} from './primitives';
import { drawBars, drawHalo, drawOrbit, drawRadial, drawWave } from './scenes';
import type { Layout, SceneInput } from './types';

const TAU = Math.PI * 2;

function createNoiseTile(palette: Palette, strength = 1): OffscreenCanvas {
  const size = 256;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(size, size);
  let seed = 0x9e3779b9;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const dark = palette.mode === 'dark';
  for (let index = 0; index < image.data.length; index += 4) {
    const value = Math.floor(random() * 255);
    image.data[index] = dark ? 255 : 0;
    image.data[index + 1] = dark ? 255 : 0;
    image.data[index + 2] = dark ? 255 : 0;
    image.data[index + 3] = Math.min(255, Math.floor((value / 255) * (dark ? 26 : 14) * strength));
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export class VisualizerRenderer {
  readonly width: number;
  readonly height: number;

  private config: RenderConfig;
  private image: ImageBitmap | null;
  private analyzer: SpectrumAnalyzer | null = null;
  private background: OffscreenCanvas | null = null;
  private art: { canvas: OffscreenCanvas; pad: number } | null = null;
  private backgroundKey = '';
  private artKey = '';

  private readonly spectrum = new Float32Array(SPECTRUM_BANDS);
  private readonly spectrumPast1 = new Float32Array(SPECTRUM_BANDS);
  private readonly spectrumPast2 = new Float32Array(SPECTRUM_BANDS);
  private readonly wave = new Float32Array(WAVE_POINTS);

  constructor(
    width: number,
    height: number,
    config: RenderConfig,
    image: ImageBitmap | null,
    analysis?: { channels: Float32Array[]; sampleRate: number; duration: number } | null,
  ) {
    this.width = width;
    this.height = height;
    this.config = config;
    this.image = image;
    this.setAnalysis(analysis ?? null);
    this.refreshCaches();
  }

  setAnalysis(
    analysis: { channels: Float32Array[]; sampleRate: number; duration: number } | null,
  ): void {
    this.analyzer = analysis ? new SpectrumAnalyzer(analysis) : null;
  }

  update(config: RenderConfig, image: ImageBitmap | null): void {
    const imageChanged = image !== this.image;
    this.config = config;
    this.image = image;
    this.refreshCaches(imageChanged);
  }

  private refreshCaches(imageChanged = false): void {
    const { palette, imagePreset, profile, tweaks } = this.config;
    const shared = [
      this.width,
      this.height,
      palette.mode,
      palette.bg,
      palette.surface,
      palette.fg,
      palette.muted,
      palette.accent,
      palette.accent2,
      palette.border,
    ].join('|');
    const backgroundKey = `${shared}|${imagePreset}|${profile}|${tweaks.background}`;
    const artKey = `${shared}|${imagePreset}`;

    if (backgroundKey !== this.backgroundKey || imageChanged || !this.background) {
      this.backgroundKey = backgroundKey;
      this.background = this.buildBackground();
    }
    if (artKey !== this.artKey || imageChanged) {
      this.artKey = artKey;
      this.art =
        this.config.imagePreset === 'frame' || this.config.imagePreset === 'center'
          ? this.buildArt()
          : null;
    }
  }

  private buildBackground(): OffscreenCanvas {
    const { width, height } = this;
    const { palette, imagePreset, profile, tweaks } = this.config;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    const dark = palette.mode === 'dark';
    const effect = tweaks.background;
    const glowScale =
      effect === 'aurora' ? 1.6 : effect === 'minimal' ? 0.35 : effect === 'grain' ? 0.8 : 1;
    const imageHaze = effect === 'ambient' || effect === 'aurora';
    const grainStrength =
      effect === 'grain' ? 1.8 : effect === 'aurora' ? 0.55 : effect === 'minimal' ? 0 : 1;

    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, mix(palette.bg, palette.fg, dark ? 0.035 : 0.02));
    base.addColorStop(0.55, palette.bg);
    base.addColorStop(1, mix(palette.bg, palette.accent2, dark ? 0.07 : 0.045));
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const drawGlow = (x: number, y: number, radius: number, color: string, alpha: number) => {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, rgba(color, alpha));
      glow.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    };

    drawGlow(
      width * 0.12,
      height * 0.15,
      height * 0.8,
      palette.accent,
      (dark ? 0.12 : 0.08) * glowScale,
    );
    drawGlow(
      width * 0.88,
      height * 0.3,
      height * 0.75,
      palette.accent2,
      (dark ? 0.11 : 0.06) * glowScale,
    );

    if (effect === 'aurora') {
      drawGlow(width * 0.48, height * 0.7, height * 0.95, palette.accent, 0.085);
      drawGlow(width * 0.18, height * 0.42, height * 0.7, palette.accent2, 0.065);
      drawGlow(width * 0.82, height * 0.78, height * 0.6, palette.accent, 0.05);
    }

    if (this.image && imagePreset !== 'clean') {
      if (imagePreset === 'cover') {
        // Cover is defined by its full-bleed artwork, so keep it for every effect.
        ctx.save();
        ctx.globalAlpha = effect === 'minimal' ? 0.92 : effect === 'aurora' ? 0.78 : 0.82;
        drawImageCover(ctx, this.image, 0, 0, width, height);
        ctx.restore();
        const tint = ctx.createLinearGradient(0, 0, 0, height);
        tint.addColorStop(0, rgba(palette.bg, effect === 'minimal' ? 0.12 : 0.2));
        tint.addColorStop(0.5, rgba(palette.bg, effect === 'minimal' ? 0.32 : 0.42));
        tint.addColorStop(1, rgba(palette.bg, dark ? 0.92 : 0.94));
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, width, height);
      } else if (imageHaze) {
        const smallWidth = Math.max(160, Math.round(width / 9));
        const smallHeight = Math.max(90, Math.round((smallWidth * height) / width));
        const small = new OffscreenCanvas(smallWidth, smallHeight);
        const smallContext = small.getContext('2d')!;
        smallContext.filter = `blur(${Math.max(2, smallWidth * 0.013)}px) saturate(0.9) brightness(${dark ? 0.68 : 0.96})`;
        drawImageCover(smallContext, this.image, 0, 0, smallWidth, smallHeight);
        ctx.save();
        ctx.globalAlpha = effect === 'aurora' ? 0.42 : dark ? 0.62 : 0.45;
        ctx.drawImage(small, 0, 0, width, height);
        ctx.restore();
        const scrim = ctx.createLinearGradient(0, 0, 0, height);
        scrim.addColorStop(0, rgba(palette.bg, dark ? 0.42 : 0.5));
        scrim.addColorStop(0.5, rgba(palette.bg, dark ? 0.28 : 0.35));
        scrim.addColorStop(1, rgba(palette.bg, dark ? 0.8 : 0.86));
        ctx.fillStyle = scrim;
        ctx.fillRect(0, 0, width, height);
      }
    }

    if (effect === 'aurora') {
      const veil = ctx.createLinearGradient(0, height * 0.1, width, height * 0.9);
      veil.addColorStop(0, rgba(palette.accent2, 0.03));
      veil.addColorStop(0.42, rgba(palette.accent, 0.055));
      veil.addColorStop(0.68, rgba(palette.accent2, 0.045));
      veil.addColorStop(1, rgba(palette.bg, 0.06));
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, width, height);
    }

    const wash = ctx.createLinearGradient(0, 0, width, height);
    const washStrength = effect === 'minimal' ? 0.5 : 1;
    wash.addColorStop(0, rgba(palette.accent, (dark ? 0.05 : 0.035) * washStrength));
    wash.addColorStop(0.5, rgba(palette.accent2, (dark ? 0.035 : 0.02) * washStrength));
    wash.addColorStop(1, rgba(palette.bg, 0.08));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    // Profile-dependent ambience keeps each look distinct without extra assets.
    if (
      effect !== 'minimal' &&
      (profile === 'radial' || profile === 'orbit' || profile === 'halo')
    ) {
      drawGlow(
        width * 0.52,
        height * 0.4,
        height * 0.5,
        palette.accent2,
        (dark ? 0.07 : 0.05) * glowScale,
      );
    }

    const vignette = ctx.createRadialGradient(
      width / 2,
      height * 0.45,
      height * 0.15,
      width / 2,
      height * 0.45,
      height * 0.78,
    );
    const vignetteAlpha =
      effect === 'minimal' ? 0.22 : effect === 'grain' ? 0.72 : effect === 'aurora' ? 0.48 : 0.6;
    vignette.addColorStop(0, rgba(palette.bg, 0));
    vignette.addColorStop(1, rgba(palette.bg, dark ? vignetteAlpha : vignetteAlpha * 0.7));
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    const textScrim = ctx.createLinearGradient(0, height * 0.5, 0, height);
    const scrimStrength = effect === 'minimal' ? 0.78 : 1;
    textScrim.addColorStop(0, rgba(palette.bg, 0));
    textScrim.addColorStop(0.72, rgba(palette.bg, (dark ? 0.38 : 0.32) * scrimStrength));
    textScrim.addColorStop(1, rgba(palette.bg, (dark ? 0.7 : 0.58) * scrimStrength));
    ctx.fillStyle = textScrim;
    ctx.fillRect(0, 0, width, height);

    if (grainStrength > 0) {
      const noise = ctx.createPattern(createNoiseTile(palette, grainStrength), 'repeat');
      if (noise) {
        ctx.fillStyle = noise;
        ctx.fillRect(0, 0, width, height);
      }
    }

    return canvas;
  }

  private getArtGeometry(): {
    x: number;
    y: number;
    size: number;
    shape: 'card' | 'circle';
  } | null {
    if (this.config.imagePreset === 'frame') {
      return {
        x: this.height * 0.055,
        y: this.height * 0.055,
        size: this.height * 0.28,
        shape: 'card',
      };
    }
    if (this.config.imagePreset === 'center') {
      const size = this.height * 0.3;
      return {
        x: this.width / 2 - size / 2,
        y: this.height * 0.345 - size / 2,
        size,
        shape: 'circle',
      };
    }
    return null;
  }

  private buildArt(): { canvas: OffscreenCanvas; pad: number } | null {
    const geometry = this.getArtGeometry();
    if (!geometry) {
      return null;
    }
    const { palette } = this.config;
    const { size, shape } = geometry;
    const pad = size * 0.12;
    const canvas = new OffscreenCanvas(Math.ceil(size + pad * 2), Math.ceil(size + pad * 2));
    const ctx = canvas.getContext('2d')!;
    const x = pad;
    const y = pad;
    const radius = shape === 'circle' ? size / 2 : size * 0.075;
    const path = () => {
      ctx.beginPath();
      if (shape === 'circle') {
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, TAU);
      } else {
        addRoundRect(ctx, x, y, size, size, radius);
      }
    };

    ctx.save();
    ctx.shadowColor = rgba(palette.accent, 0.35);
    ctx.shadowBlur = size * 0.09;
    ctx.shadowOffsetY = size * 0.012;
    path();
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.restore();

    ctx.save();
    path();
    ctx.clip();

    if (this.image) {
      drawImageCover(ctx, this.image, x, y, size, size);
    } else {
      const fallback = ctx.createLinearGradient(x, y, x + size, y + size);
      fallback.addColorStop(0, mix(palette.surface, palette.accent2, 0.32));
      fallback.addColorStop(0.55, mix(palette.surface, palette.accent, 0.16));
      fallback.addColorStop(1, mix(palette.surface, palette.accent2, 0.24));
      ctx.fillStyle = fallback;
      ctx.fillRect(x, y, size, size);

      const glow = ctx.createRadialGradient(
        x + size * 0.5,
        y + size * 0.5,
        0,
        x + size * 0.5,
        y + size * 0.5,
        size * 0.55,
      );
      glow.addColorStop(0, rgba(palette.accent, 0.22));
      glow.addColorStop(1, rgba(palette.accent, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(x, y, size, size);

      const bars = [0.2, 0.42, 0.6, 0.36, 0.18];
      const barWidth = size * 0.052;
      const gap = size * 0.045;
      const total = bars.length * barWidth + (bars.length - 1) * gap;
      const startX = x + (size - total) / 2;
      ctx.fillStyle = rgba(palette.accent, 0.9);
      ctx.beginPath();
      bars.forEach((heightRatio, index) => {
        const barHeight = size * heightRatio;
        addRoundRect(
          ctx,
          startX + index * (barWidth + gap),
          y + size / 2 - barHeight / 2,
          barWidth,
          barHeight,
          barWidth / 2,
        );
        ctx.fill();
      });
      ctx.fillStyle = rgba(palette.accent2, 0.9);
      ctx.beginPath();
      ctx.arc(x + size * 0.76, y + size * 0.26, size * 0.022, 0, TAU);
      ctx.fill();
    }

    const shade = ctx.createLinearGradient(0, y, 0, y + size);
    shade.addColorStop(0, rgba(palette.fg, 0.08));
    shade.addColorStop(0.35, rgba(palette.fg, 0));
    shade.addColorStop(1, rgba(palette.bg, 0.28));
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, size, size);
    ctx.restore();

    ctx.strokeStyle = rgba(palette.fg, 0.16);
    ctx.lineWidth = Math.max(1, size * 0.003);
    path();
    ctx.stroke();

    if (shape === 'circle') {
      ctx.strokeStyle = rgba(palette.accent, 0.4);
      ctx.lineWidth = Math.max(1, size * 0.004);
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2 + pad * 0.42, 0, TAU);
      ctx.stroke();
    }

    return { canvas, pad };
  }

  private computeLayout(ctx: Render2D): Layout {
    const { width, height, config } = this;
    const margin = height * 0.055;
    const preset = config.imagePreset;
    const titleSize = height * 0.057;
    const titleLineHeight = titleSize * 1.03;
    const artistSize = height * 0.022;
    const align = preset === 'center' ? 'center' : 'left';
    const textX = align === 'center' ? width / 2 : margin;
    const textMaxWidth = width * (align === 'center' ? 0.76 : 0.64);

    ctx.font = `700 ${titleSize}px ${DISPLAY_FONT}`;
    setLetterSpacing(ctx, `${-titleSize * 0.022}px`);
    const titleLines = wrapText(ctx, config.title, textMaxWidth, 2);

    let artistText = '';
    if (config.artist.trim()) {
      ctx.font = `500 ${artistSize}px ${DISPLAY_FONT}`;
      setLetterSpacing(ctx, `${artistSize * 0.14}px`);
      artistText = ellipsize(ctx, config.artist.trim().toUpperCase(), textMaxWidth);
    }
    setLetterSpacing(ctx, '0px');

    const gap = height * 0.018;
    const artistBlock = artistText ? artistSize + gap : 0;
    const titleBlock = titleLines.length * titleLineHeight;
    const textTop = height - margin - artistBlock - titleBlock;
    const art = this.getArtGeometry();

    let stage: { x: number; y: number; radius: number };
    if (art) {
      if (preset === 'center') {
        stage = {
          x: art.x + art.size / 2,
          y: art.y + art.size / 2,
          radius: art.size * 0.55,
        };
      } else {
        stage = { x: width * 0.55, y: height * 0.41, radius: height * 0.11 };
      }
    } else {
      stage = {
        x: width * (preset === 'cover' ? 0.53 : 0.5),
        y: height * 0.4,
        radius: height * 0.115,
      };
    }

    const barBase = Math.max(height * 0.6, textTop - height * 0.052);
    const waveCenter = preset === 'center' ? height * 0.6 : height * 0.585;

    return {
      margin,
      textX,
      textAlign: align,
      textMaxWidth,
      titleSize,
      titleLineHeight,
      artistSize,
      textTop,
      heightScale: clamp(
        this.config.tweaks.height,
        VIDEO_TWEAK_RANGES.height.min,
        VIDEO_TWEAK_RANGES.height.max,
      ),
      art,
      stage,
      bar: {
        left: margin,
        right: width - margin,
        base: barBase,
        maxHeight: Math.min(height * 0.19, barBase - height * 0.28),
      },
      wave: {
        left: margin,
        right: width - margin,
        center: waveCenter,
      },
      titleLines,
      artistText,
    };
  }

  private drawText(ctx: Render2D, layout: Layout): void {
    const { height, config } = this;
    const { palette } = config;
    if (!layout.titleLines.length && !layout.artistText) {
      return;
    }

    ctx.save();
    ctx.textAlign = layout.textAlign;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = rgba(palette.bg, palette.mode === 'dark' ? 0.75 : 0.55);
    ctx.shadowBlur = height * 0.022;
    ctx.shadowOffsetY = height * 0.002;

    const bottom = height - layout.margin;
    const titleBaseline = bottom - (layout.artistText ? layout.artistSize + height * 0.02 : 0);
    const lines = layout.titleLines;
    if (lines.length > 0) {
      const ruleWidth = height * 0.026;
      const ruleY = layout.textTop - height * 0.018;
      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      addRoundRect(
        ctx,
        layout.textAlign === 'center' ? layout.textX - ruleWidth / 2 : layout.textX,
        ruleY,
        ruleWidth,
        Math.max(1.4, height * 0.0022),
        height * 0.0015,
      );
      ctx.fill();

      ctx.fillStyle = palette.fg;
      ctx.font = `700 ${layout.titleSize}px ${DISPLAY_FONT}`;
      setLetterSpacing(ctx, `${-layout.titleSize * 0.022}px`);
      for (let index = 0; index < lines.length; index += 1) {
        const baseline = titleBaseline - (lines.length - 1 - index) * layout.titleLineHeight;
        ctx.fillText(lines[index]!, layout.textX, baseline);
      }
    }

    if (layout.artistText) {
      ctx.fillStyle = mix(palette.muted, palette.accent, 0.28);
      ctx.font = `500 ${layout.artistSize}px ${DISPLAY_FONT}`;
      setLetterSpacing(ctx, `${layout.artistSize * 0.14}px`);
      ctx.fillText(layout.artistText, layout.textX, bottom);
    }
    setLetterSpacing(ctx, '0px');
    ctx.restore();
  }

  private drawDemo(time: number): void {
    const bands = this.spectrum.length;
    for (let index = 0; index < bands; index += 1) {
      const position = index / bands;
      const motion =
        Math.sin(time * 1.4 + position * 11) * 0.3 +
        Math.sin(time * 0.63 + position * 23 + 1.7) * 0.22 +
        Math.sin(time * 2.1 + position * 37) * 0.12;
      const shape = Math.pow(1 - position, 1.4) * 0.42 + 0.16;
      this.spectrum[index] = clamp(shape + motion * shape * 1.8, 0, 1);
    }

    const points = this.wave.length;
    const motion = Math.sin(time * 0.8) * 0.35 + 0.5;
    for (let index = 0; index < points; index += 1) {
      const phase = index / points;
      this.wave[index] =
        Math.sin(phase * TAU * 3 + time * 3.1) * 0.16 * motion +
        Math.sin(phase * TAU * 7 - time * 1.7) * 0.07 +
        Math.sin(phase * TAU - time * 0.9) * 0.1;
    }
  }

  draw(ctx: Render2D, time: number): void {
    const { width, height, config } = this;
    const { palette } = config;
    if (!this.background) {
      return;
    }

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.background, 0, 0, width, height);

    if (!this.analyzer) {
      this.drawDemo(time);
    } else {
      this.analyzer.spectrumAt(time, this.spectrum);
      const smoothing = clamp(
        this.config.tweaks.smoothing,
        VIDEO_TWEAK_RANGES.smoothing.min,
        VIDEO_TWEAK_RANGES.smoothing.max,
      );
      if (smoothing > 0.01) {
        // Fixed 60 Hz taps make the smoothing deterministic across preview FPS and export FPS.
        this.analyzer.spectrumAt(time - 1 / 60, this.spectrumPast1);
        this.analyzer.spectrumAt(time - 1 / 30, this.spectrumPast2);
        const currentWeight = 1 - 0.65 * smoothing;
        const nearWeight = 0.4 * smoothing;
        const farWeight = 0.25 * smoothing;
        for (let index = 0; index < this.spectrum.length; index += 1) {
          this.spectrum[index] = clamp(
            this.spectrum[index]! * currentWeight +
              this.spectrumPast1[index]! * nearWeight +
              this.spectrumPast2[index]! * farWeight,
            0,
            1,
          );
        }
      }
      this.analyzer.waveformAt(time, this.wave);
    }

    const sensitivity = clamp(
      this.config.tweaks.sensitivity,
      VIDEO_TWEAK_RANGES.sensitivity.min,
      VIDEO_TWEAK_RANGES.sensitivity.max,
    );
    if (Math.abs(sensitivity - 1) > 0.001) {
      for (let index = 0; index < this.spectrum.length; index += 1) {
        this.spectrum[index] = clamp(this.spectrum[index]! * sensitivity, 0, 1);
      }
    }

    const layout = this.computeLayout(ctx);
    const bass = this.averageBands(0, 0.08);
    const level = this.averageBands(0, 1);

    if (config.tweaks.background === 'aurora') {
      const auroraX = width * (0.5 + Math.sin(time * 0.07) * 0.3);
      const auroraY = height * (0.48 + Math.cos(time * 0.05) * 0.16);
      const aurora = ctx.createRadialGradient(auroraX, auroraY, 0, auroraX, auroraY, height * 0.78);
      aurora.addColorStop(0, rgba(palette.accent2, 0.055 + bass * 0.055));
      aurora.addColorStop(0.45, rgba(palette.accent, 0.025 + bass * 0.025));
      aurora.addColorStop(1, rgba(palette.accent2, 0));
      ctx.fillStyle = aurora;
      ctx.fillRect(0, 0, width, height);
    }

    const glow = ctx.createRadialGradient(
      layout.stage.x,
      layout.stage.y,
      0,
      layout.stage.x,
      layout.stage.y,
      height * 0.55,
    );
    glow.addColorStop(0, rgba(palette.accent, 0.045 + bass * 0.07));
    glow.addColorStop(0.65, rgba(palette.accent2, 0.02 + bass * 0.025));
    glow.addColorStop(1, rgba(palette.accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const scene: SceneInput = {
      ctx,
      width,
      height,
      time,
      palette,
      layout,
      spectrum: this.spectrum,
      wave: this.wave,
      bass,
      level,
    };
    switch (config.profile) {
      case 'bars':
        drawBars(scene);
        break;
      case 'wave':
        drawWave(scene);
        break;
      case 'radial':
        drawRadial(scene);
        break;
      case 'halo':
        drawHalo(scene);
        break;
      case 'orbit':
        drawOrbit(scene);
        break;
    }

    if (this.art && layout.art) {
      ctx.drawImage(
        this.art.canvas,
        layout.art.x - this.art.pad,
        layout.art.y - this.art.pad,
        layout.art.size + this.art.pad * 2,
        layout.art.size + this.art.pad * 2,
      );
    }

    this.drawText(ctx, layout);

    const inset = height * 0.022;
    ctx.strokeStyle = rgba(palette.fg, 0.14);
    ctx.lineWidth = Math.max(1, height * 0.001);
    addRoundRect(ctx, inset, inset, width - inset * 2, height - inset * 2, height * 0.014);
    ctx.stroke();

    ctx.restore();
  }

  private averageBands(fromRatio: number, toRatio: number): number {
    if (!this.analyzer) {
      const from = Math.floor(fromRatio * this.spectrum.length);
      const to = Math.max(from + 1, Math.ceil(toRatio * this.spectrum.length));
      let sum = 0;
      for (let index = from; index < to; index += 1) {
        sum += this.spectrum[index]!;
      }
      return sum / (to - from);
    }
    return this.analyzer.averageBands(this.spectrum, fromRatio, toRatio);
  }
}

export async function ensureDisplayFont(fontUrl: string): Promise<void> {
  if (typeof FontFace === 'undefined') {
    return;
  }
  try {
    const face = new FontFace('Outfit', `url("${fontUrl}")`, {
      weight: '100 900',
      style: 'normal',
    });
    await face.load();
    const fontSet =
      typeof document !== 'undefined'
        ? document.fonts
        : (globalThis as { fonts?: FontFaceSet }).fonts;
    fontSet?.add(face);
  } catch {
    // The system fallback stack is deliberately close in tone; rendering must not fail.
  }
}
