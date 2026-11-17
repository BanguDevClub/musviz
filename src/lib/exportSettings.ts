import type { AudioCodec, VideoCodec } from 'mediabunny';
import type { ContainerId, ExportSettings, FpsId, QualityId, ResolutionId } from '../types';
import { CONTAINERS, FPS_OPTIONS, QUALITY_OPTIONS, RESOLUTIONS } from './constants';

const STORAGE_KEY = 'musviz:export';

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  container: 'mp4',
  height: 1080,
  fps: 30,
  quality: 'high',
  saveMode: 'download',
  videoCodec: 'avc',
  audioCodec: 'aac',
};

function isContainer(value: unknown): value is ContainerId {
  return CONTAINERS.some((item) => item.id === value);
}

function isHeight(value: unknown): value is ResolutionId {
  return RESOLUTIONS.some((item) => item.id === value);
}

function isFps(value: unknown): value is FpsId {
  return FPS_OPTIONS.includes(value as FpsId);
}

function isQuality(value: unknown): value is QualityId {
  return QUALITY_OPTIONS.some((item) => item.id === value);
}

export function readExportSettings(): ExportSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_EXPORT_SETTINGS;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_EXPORT_SETTINGS;
    }
    const record = parsed as Record<string, unknown>;
    return {
      container: isContainer(record.container)
        ? record.container
        : DEFAULT_EXPORT_SETTINGS.container,
      height: isHeight(record.height) ? record.height : DEFAULT_EXPORT_SETTINGS.height,
      fps: isFps(record.fps) ? record.fps : DEFAULT_EXPORT_SETTINGS.fps,
      quality: isQuality(record.quality) ? record.quality : DEFAULT_EXPORT_SETTINGS.quality,
      saveMode:
        record.saveMode === 'picker' || record.saveMode === 'download'
          ? record.saveMode
          : DEFAULT_EXPORT_SETTINGS.saveMode,
      videoCodec:
        typeof record.videoCodec === 'string'
          ? (record.videoCodec as VideoCodec)
          : DEFAULT_EXPORT_SETTINGS.videoCodec,
      audioCodec:
        typeof record.audioCodec === 'string'
          ? (record.audioCodec as AudioCodec)
          : DEFAULT_EXPORT_SETTINGS.audioCodec,
    };
  } catch {
    return DEFAULT_EXPORT_SETTINGS;
  }
}

export function persistExportSettings(settings: ExportSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Persistence is a convenience; export still works without storage.
  }
}
