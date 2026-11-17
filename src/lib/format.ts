export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const rounded = Math.floor(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) {
    return '—';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatSampleRate(rate: number): string {
  if (!Number.isFinite(rate)) {
    return '—';
  }
  const khz = rate / 1000;
  return `${khz.toFixed(khz % 1 === 0 ? 0 : 1)} kHz`;
}

export function formatChannels(channels: number): string {
  if (channels === 1) {
    return 'Mono';
  }
  if (channels === 2) {
    return 'Stereo';
  }
  return `${channels} channels`;
}

export function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'musviz';
}

export function buildFileName(
  title: string,
  height: number,
  fps: number,
  extension: string,
): string {
  return `${slugify(title || 'musviz')}-${height}p-${fps}fps.${extension}`;
}

export function formatFrameCount(duration: number, fps: number): string {
  const frames = Math.max(1, Math.ceil(duration * fps));
  return `${frames.toLocaleString()} frames`;
}
