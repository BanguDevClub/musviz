import {
  getEncodableAudioCodecs,
  getEncodableVideoCodecs,
  MkvOutputFormat,
  MovOutputFormat,
  Mp4OutputFormat,
  Quality,
  WebMOutputFormat,
  type AudioCodec,
  type OutputFormat,
  type VideoCodec,
} from 'mediabunny';
import type { ContainerId, QualityId } from '../types';

export function createOutputFormat(container: ContainerId): OutputFormat {
  switch (container) {
    case 'mp4':
      return new Mp4OutputFormat();
    case 'webm':
      return new WebMOutputFormat();
    case 'mkv':
      return new MkvOutputFormat();
    case 'mov':
      return new MovOutputFormat();
  }
}

export type CodecAvailability = {
  video: VideoCodec[];
  audio: AudioCodec[];
};

const videoCache = new Map<string, Promise<VideoCodec[]>>();
const audioCache = new Map<string, Promise<AudioCodec[]>>();

export function probeVideoCodecs(
  container: ContainerId,
  width: number,
  height: number,
  fps: number,
  quality: QualityId,
): Promise<VideoCodec[]> {
  const key = `${container}:${width}:${height}:${fps}:${quality}`;
  const cached = videoCache.get(key);
  if (cached) {
    return cached;
  }
  const format = createOutputFormat(container);
  const probe = getEncodableVideoCodecs(format.getSupportedVideoCodecs(), {
    width,
    height,
    frameRate: fps,
    quality: new Quality(quality),
  }).catch(() => [] as VideoCodec[]);
  videoCache.set(key, probe);
  return probe;
}

export function probeAudioCodecs(
  container: ContainerId,
  numberOfChannels: number,
  sampleRate = 48000,
): Promise<AudioCodec[]> {
  const key = `${container}:${numberOfChannels}:${sampleRate}`;
  const cached = audioCache.get(key);
  if (cached) {
    return cached;
  }
  const format = createOutputFormat(container);
  const probe = getEncodableAudioCodecs(format.getSupportedAudioCodecs(), {
    numberOfChannels,
    sampleRate,
    quality: new Quality('high'),
  }).catch(() => [] as AudioCodec[]);
  audioCache.set(key, probe);
  return probe;
}

export function pickVideoCodec(available: VideoCodec[], preferred: VideoCodec): VideoCodec | null {
  if (available.includes(preferred)) {
    return preferred;
  }
  const fallbackOrder: VideoCodec[] = ['avc', 'vp9', 'av1', 'vp8', 'hevc', 'prores'];
  return fallbackOrder.find((codec) => available.includes(codec)) ?? available[0] ?? null;
}

export function pickAudioCodec(available: AudioCodec[], preferred: AudioCodec): AudioCodec | null {
  if (available.includes(preferred)) {
    return preferred;
  }
  const fallbackOrder: AudioCodec[] = ['aac', 'opus', 'mp3', 'flac', 'vorbis'];
  return fallbackOrder.find((codec) => available.includes(codec)) ?? available[0] ?? null;
}

export function isPcmCodec(codec: AudioCodec): boolean {
  return codec.startsWith('pcm-') || codec === 'ulaw' || codec === 'alaw';
}
