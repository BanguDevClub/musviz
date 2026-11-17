import type { AudioCodec, VideoCodec } from 'mediabunny';

export type ThemeId = 'dark' | 'light' | 'latte' | 'frappe' | 'macchiato' | 'mocha';
export type ThemeMode = 'dark' | 'light';

export type Palette = {
  mode: ThemeMode;
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  accent: string;
  accent2: string;
  border: string;
};

export type ProfileId = 'bars' | 'wave' | 'radial' | 'halo' | 'orbit';
export type ImagePresetId = 'frame' | 'center' | 'cover' | 'clean';
export type BackgroundEffect = 'ambient' | 'aurora' | 'grain' | 'minimal';

export type RenderTweaks = {
  background: BackgroundEffect;
  sensitivity: number;
  smoothing: number;
  height: number;
};

export type VideoTweaks = RenderTweaks & {
  accent: string;
  accent2: string;
};

export type RenderConfig = {
  profile: ProfileId;
  imagePreset: ImagePresetId;
  title: string;
  artist: string;
  palette: Palette;
  tweaks: RenderTweaks;
};

export type DecodedAudio = {
  file: File;
  name: string;
  size: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  /** Stereo or mono PCM, one Float32Array per channel. */
  channels: Float32Array<ArrayBuffer>[];
  /** Normalized peak envelope for compact UI waveforms. */
  peaks: Float32Array;
  codec: string | null;
  tags: { title: string | null; artist: string | null };
};

export type LoadedImage = {
  file: File;
  bitmap: ImageBitmap;
  url: string;
  width: number;
  height: number;
};

export type ContainerId = 'mp4' | 'webm' | 'mkv' | 'mov';
export type ResolutionId = 720 | 1080 | 1440 | 2160;
export type FpsId = 15 | 30 | 60;
export type QualityId = 'medium' | 'high' | 'very-high';

export type SaveMode = 'download' | 'picker';

export type ExportSettings = {
  container: ContainerId;
  height: ResolutionId;
  fps: FpsId;
  quality: QualityId;
  saveMode: SaveMode;
  videoCodec: VideoCodec;
  audioCodec: AudioCodec;
};

export type ExportPhase = 'preparing' | 'audio' | 'rendering' | 'finalizing';

export type ExportProgress = {
  phase: ExportPhase;
  /** 0..1 */
  progress: number;
  frame: number;
  totalFrames: number;
};

export type ExportResult = {
  name: string;
  size: number | null;
  url: string | null;
  savedToDisk: boolean;
};
