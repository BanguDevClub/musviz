import type {
  ContainerId,
  FpsId,
  ImagePresetId,
  ProfileId,
  QualityId,
  ResolutionId,
} from '../types';

export const GITHUB_URL = 'https://github.com/BanguDevClub/musviz';
export const SITE_URL = 'https://bangudevclub.github.io/musviz/';
export const PROJECT_NAME = 'MusViz';
export const MAX_TRACK_SECONDS = 15 * 60;

export const PROFILES: {
  id: ProfileId;
  name: string;
  description: string;
}[] = [
  {
    id: 'bars',
    name: 'Spectrum',
    description: 'Log-spaced frequency bars with a soft mirrored glow.',
  },
  {
    id: 'wave',
    name: 'Waveform',
    description: 'A layered oscilloscope tracing the track in real time.',
  },
  {
    id: 'radial',
    name: 'Radial',
    description: 'A circular spectrum that blooms and rotates with the beat.',
  },
  { id: 'halo', name: 'Halo', description: 'A polar waveform wrapped around a breathing ring.' },
  {
    id: 'orbit',
    name: 'Orbit',
    description: 'Frequency dots in orbit, connected by a luminous thread.',
  },
];

export const IMAGE_PRESETS: {
  id: ImagePresetId;
  name: string;
  description: string;
}[] = [
  { id: 'frame', name: 'Frame', description: 'Artwork top-left, border glow, blurred backdrop.' },
  {
    id: 'center',
    name: 'Center',
    description: 'Artwork centered above the labels, ambient backdrop.',
  },
  { id: 'cover', name: 'Cover', description: 'Full-bleed artwork with a deep cinematic scrim.' },
  { id: 'clean', name: 'Clean', description: 'No artwork — pure gradients and motion.' },
];

export const RESOLUTIONS: {
  id: ResolutionId;
  width: number;
  height: number;
  label: string;
  hint: string;
}[] = [
  { id: 720, width: 1280, height: 720, label: '720p', hint: 'HD' },
  { id: 1080, width: 1920, height: 1080, label: '1080p', hint: 'Full HD' },
  { id: 1440, width: 2560, height: 1440, label: '1440p', hint: 'QHD' },
  { id: 2160, width: 3840, height: 2160, label: '2160p', hint: '4K UHD' },
];

export const FPS_OPTIONS: FpsId[] = [15, 30, 60];

export const QUALITY_OPTIONS: { id: QualityId; label: string }[] = [
  { id: 'medium', label: 'Standard — smaller files' },
  { id: 'high', label: 'High — recommended' },
  { id: 'very-high', label: 'Master — largest files' },
];

export const CONTAINERS: {
  id: ContainerId;
  name: string;
  extension: string;
  description: string;
}[] = [
  { id: 'mp4', name: 'MP4', extension: 'mp4', description: 'Plays everywhere' },
  { id: 'webm', name: 'WebM', extension: 'webm', description: 'Open web, alpha ready' },
  { id: 'mkv', name: 'Matroska', extension: 'mkv', description: 'Every codec' },
  { id: 'mov', name: 'QuickTime', extension: 'mov', description: 'Pro workflows' },
];

export const VIDEO_CODEC_LABELS: Record<string, string> = {
  avc: 'H.264 / AVC',
  hevc: 'H.265 / HEVC',
  vp8: 'VP8',
  vp9: 'VP9',
  av1: 'AV1',
  prores: 'Apple ProRes',
};

export const AUDIO_CODEC_LABELS: Record<string, string> = {
  aac: 'AAC',
  opus: 'Opus',
  mp3: 'MP3',
  vorbis: 'Vorbis',
  flac: 'FLAC',
  ac3: 'Dolby Digital (AC-3)',
  eac3: 'Dolby Digital Plus (E-AC-3)',
  dts: 'DTS',
  truehd: 'Dolby TrueHD',
  'pcm-u8': 'PCM unsigned 8-bit',
  'pcm-s8': 'PCM signed 8-bit',
  'pcm-s16': 'PCM signed 16-bit',
  'pcm-s16be': 'PCM signed 16-bit BE',
  'pcm-s24': 'PCM signed 24-bit',
  'pcm-s24be': 'PCM signed 24-bit BE',
  'pcm-s32': 'PCM signed 32-bit',
  'pcm-s32be': 'PCM signed 32-bit BE',
  'pcm-f32': 'PCM float 32-bit',
  'pcm-f32be': 'PCM float 32-bit BE',
  'pcm-f64': 'PCM float 64-bit',
  'pcm-f64be': 'PCM float 64-bit BE',
  ulaw: 'μ-law PCM',
  alaw: 'A-law PCM',
};

export const THEME_STORAGE_KEY = 'musviz:theme';
