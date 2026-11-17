export const FFT_SIZE = 2048;
export const WAVE_POINTS = 1024;
export const SPECTRUM_BANDS = 72;

const FFT_LEVELS = Math.log2(FFT_SIZE);
const SPECTRUM_MIN_HZ = 32;
const SPECTRUM_MAX_HZ = 18000;
const DB_FLOOR = -70;
const DB_CEIL = -6;

class Fft {
  private readonly cosTable: Float32Array;
  private readonly sinTable: Float32Array;
  private readonly reversed: Uint16Array;

  constructor(private readonly size: number) {
    const half = size / 2;
    this.cosTable = new Float32Array(half);
    this.sinTable = new Float32Array(half);
    for (let i = 0; i < half; i += 1) {
      const angle = (2 * Math.PI * i) / size;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }

    this.reversed = new Uint16Array(size);
    for (let i = 0; i < size; i += 1) {
      let value = i;
      let result = 0;
      for (let bit = 0; bit < FFT_LEVELS; bit += 1) {
        result = (result << 1) | (value & 1);
        value >>= 1;
      }
      this.reversed[i] = result;
    }
  }

  transform(re: Float32Array, im: Float32Array): void {
    const n = this.size;
    for (let i = 0; i < n; i += 1) {
      const j = this.reversed[i]!;
      if (j > i) {
        const real = re[i]!;
        const imag = im[i]!;
        re[i] = re[j]!;
        im[i] = im[j]!;
        re[j] = real;
        im[j] = imag;
      }
    }

    for (let span = 2; span <= n; span <<= 1) {
      const half = span >> 1;
      const stride = n / span;
      for (let start = 0; start < n; start += span) {
        for (let k = 0, offset = 0; k < half; k += 1, offset += stride) {
          const cos = this.cosTable[offset]!;
          const sin = this.sinTable[offset]!;
          const evenRe = re[start + k]!;
          const evenIm = im[start + k]!;
          const oddRe = re[start + k + half]!;
          const oddIm = im[start + k + half]!;
          const rotRe = oddRe * cos + oddIm * sin;
          const rotIm = oddIm * cos - oddRe * sin;
          re[start + k] = evenRe + rotRe;
          im[start + k] = evenIm + rotIm;
          re[start + k + half] = evenRe - rotRe;
          im[start + k + half] = evenIm - rotIm;
        }
      }
    }
  }
}

export type AnalysisSource = {
  channels: Float32Array[];
  sampleRate: number;
  duration: number;
};

export type BandRange = {
  startBin: number;
  endBin: number;
  centerHz: number;
};

/**
 * Deterministic spectral analysis of decoded PCM. The exact same sample window is used for
 * a given timestamp in preview and export, so visual output is reproducible at any resolution.
 */
export class SpectrumAnalyzer {
  readonly bandCount: number;
  readonly bandRanges: BandRange[];

  private readonly channels: Float32Array[];
  private readonly sampleRate: number;
  private readonly channelCount: number;
  private readonly length: number;
  private readonly window: Float32Array;
  private readonly fft = new Fft(FFT_SIZE);
  private readonly re = new Float32Array(FFT_SIZE);
  private readonly im = new Float32Array(FFT_SIZE);
  private readonly windowed = new Float32Array(FFT_SIZE);
  private readonly raw: Float32Array;
  private readonly output: Float32Array;

  constructor(source: AnalysisSource, bandCount = SPECTRUM_BANDS) {
    this.channels = source.channels;
    this.sampleRate = source.sampleRate;
    this.channelCount = source.channels.length;
    this.length = this.channelCount > 0 ? (this.channels[0]?.length ?? 0) : 0;
    this.bandCount = bandCount;
    this.window = new Float32Array(FFT_SIZE);
    for (let i = 0; i < FFT_SIZE; i += 1) {
      this.window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
    }
    this.raw = new Float32Array(bandCount);
    this.output = new Float32Array(bandCount);
    this.bandRanges = this.buildBandRanges(bandCount);
  }

  private buildBandRanges(bandCount: number): BandRange[] {
    const nyquist = this.sampleRate / 2;
    const maxHz = Math.min(SPECTRUM_MAX_HZ, nyquist);
    const ratio = maxHz / SPECTRUM_MIN_HZ;
    const ranges: BandRange[] = [];
    let previousEnd = 1;

    for (let band = 0; band < bandCount; band += 1) {
      const low = SPECTRUM_MIN_HZ * Math.pow(ratio, band / bandCount);
      const high = SPECTRUM_MIN_HZ * Math.pow(ratio, (band + 1) / bandCount);
      const startBin = Math.max(
        1,
        Math.min(FFT_SIZE / 2 - 1, Math.round((low / this.sampleRate) * FFT_SIZE)),
      );
      const endBin = Math.max(
        startBin + 1,
        Math.min(FFT_SIZE / 2, Math.round((high / this.sampleRate) * FFT_SIZE)),
      );
      const safeStart = Math.max(previousEnd, startBin);
      previousEnd = Math.max(previousEnd, endBin);
      ranges.push({
        startBin: safeStart,
        endBin: Math.max(safeStart + 1, endBin),
        centerHz: Math.sqrt(low * high),
      });
    }

    return ranges;
  }

  private mixAt(index: number): number {
    if (index < 0 || index >= this.length) {
      return 0;
    }
    let value = 0;
    for (let channel = 0; channel < this.channelCount; channel += 1) {
      value += this.channels[channel]![index]!;
    }
    return value / this.channelCount;
  }

  /** Fills `target` with normalized 0..1 log-spaced band energies at the given time. */
  spectrumAt(time: number, target: Float32Array = this.output): Float32Array {
    const start = Math.round(time * this.sampleRate - FFT_SIZE / 2);

    for (let i = 0; i < FFT_SIZE; i += 1) {
      this.windowed[i] = this.mixAt(start + i) * this.window[i]!;
      this.re[i] = this.windowed[i]!;
      this.im[i] = 0;
    }

    this.fft.transform(this.re, this.im);

    // Magnitude normalization compensates for the Hann window's coherent gain.
    const norm = 4 / FFT_SIZE;
    for (let band = 0; band < this.bandCount; band += 1) {
      const range = this.bandRanges[band]!;
      let power = 0;
      let count = 0;
      for (let bin = range.startBin; bin < range.endBin; bin += 1) {
        const real = this.re[bin]!;
        const imag = this.im[bin]!;
        power += real * real + imag * imag;
        count += 1;
      }
      const amplitude = Math.sqrt(power / Math.max(1, count)) * norm;
      let db = 20 * Math.log10(Math.max(amplitude, 1e-7));
      // Gentle high-frequency lift: mixes naturally dark, visuals read better with it.
      db += (band / Math.max(1, this.bandCount - 1)) * 14;
      const normalized = Math.min(1, Math.max(0, (db - DB_FLOOR) / (DB_CEIL - DB_FLOOR)));
      this.raw[band] = Math.pow(normalized, 0.9);
    }

    for (let band = 0; band < this.bandCount; band += 1) {
      const previous = this.raw[Math.max(0, band - 1)]!;
      const next = this.raw[Math.min(this.bandCount - 1, band + 1)]!;
      target[band] = Math.min(1, this.raw[band]! * 0.7 + (previous + next) * 0.15);
    }

    return target;
  }

  /** Fills `target` with a windowed waveform (values roughly -1..1). */
  waveformAt(time: number, target: Float32Array): Float32Array {
    const start = Math.round(time * this.sampleRate - FFT_SIZE / 2);
    const step = FFT_SIZE / target.length;
    let peak = 0;
    for (let i = 0; i < target.length; i += 1) {
      const from = Math.floor(start + i * step);
      const to = Math.floor(start + (i + 1) * step);
      let sum = 0;
      let count = 0;
      for (let index = from; index < to; index += 1) {
        sum += this.mixAt(index);
        count += 1;
      }
      const value = count > 0 ? sum / count : 0;
      target[i] = value;
      peak = Math.max(peak, Math.abs(value));
    }

    // Auto-gain gives the oscilloscope a readable shape on quiet masters while staying
    // deterministic; a fixed scale would render typical tracks as a flat line.
    const gain = Math.min(3.5, Math.max(1, 0.62 / Math.max(0.03, peak)));
    for (let i = 0; i < target.length; i += 1) {
      target[i] = target[i]! * gain;
    }
    return target;
  }

  averageBands(spectrum: Float32Array, fromRatio: number, toRatio: number): number {
    const from = Math.max(0, Math.floor(fromRatio * this.bandCount));
    const to = Math.min(this.bandCount, Math.max(from + 1, Math.ceil(toRatio * this.bandCount)));
    let sum = 0;
    for (let i = from; i < to; i += 1) {
      sum += spectrum[i]!;
    }
    return sum / (to - from);
  }
}
