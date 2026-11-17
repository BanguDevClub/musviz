import { useMemo } from 'react';

export function MiniWaveform({ peaks }: { peaks: Float32Array }) {
  const path = useMemo(() => {
    const count = Math.min(128, peaks.length);
    if (count === 0) {
      return '';
    }
    const top: string[] = [];
    const bottom: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const source = Math.floor((index / count) * peaks.length);
      const amplitude = Math.max(0.02, peaks[source] ?? 0) * 16;
      const x = (index / (count - 1)) * 128;
      top.push(`${x.toFixed(2)},${(18 - amplitude).toFixed(2)}`);
      bottom.push(`${x.toFixed(2)},${(18 + amplitude).toFixed(2)}`);
    }
    return `M${top.join(' L')} L${bottom.reverse().join(' L')} Z`;
  }, [peaks]);

  if (!path) {
    return null;
  }

  return (
    <svg className="mini-wave" viewBox="0 0 128 36" preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="currentColor" opacity="0.18" />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
