import type { SVGProps } from 'react';
import type { ImagePresetId, ProfileId } from '../types';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function LogoMark({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <g stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M4 9.5v5" />
        <path d="M7.5 6.5v11" />
        <path d="M11 3.5v17" />
        <path d="M14.5 7.5v9" />
        <path d="M18 9.5v5" />
      </g>
      <circle cx="20.5" cy="6" r="1.6" fill="var(--accent-2)" />
    </svg>
  );
}

export function IconAudio(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </Svg>
  );
}

export function IconImage(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4 17 5-5 4 4 3-3 4 4" />
    </Svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </Svg>
  );
}

export function IconGithub({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.95.68 1.91 0 1.38-.01 2.49-.01 2.83 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg
      width={props.size ?? 16}
      height={props.size ?? 16}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 5.4c0-.8.9-1.3 1.6-.9l9.3 6.1c.6.4.6 1.3 0 1.7l-9.3 6.1c-.7.5-1.6 0-1.6-.9V5.4Z" />
    </svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <svg
      width={props.size ?? 16}
      height={props.size ?? 16}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <rect x="6" y="4.5" width="4.2" height="15" rx="1.4" />
      <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 20h16" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

export function IconSpark(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
      <circle cx="12" cy="12" r="2.6" />
    </Svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 21 20H3L12 3.5Z" />
      <path d="M12 9v5" />
      <path d="M12 17.2h.01" />
    </Svg>
  );
}

export function IconFilm(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" />
    </Svg>
  );
}

export function IconReplace(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 7h-7a5 5 0 0 0-5 5v1" />
      <path d="m17 4 3 3-3 3" />
      <path d="M4 17h7a5 5 0 0 0 5-5v-1" />
      <path d="m7 20-3-3 3-3" />
    </Svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6.5 7 7.5 20h9l1-13" />
      <path d="M10 11v5M14 11v5" />
    </Svg>
  );
}

export function IconExpand(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
    </Svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.8h.01" />
    </Svg>
  );
}

export function IconMonitor(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </Svg>
  );
}

export function ProfileGlyph({ id }: { id: ProfileId }) {
  if (id === 'bars') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M3.5 14v4M8 10v8M12 5v13M16 9v9M20.5 12v6" />
      </svg>
    );
  }
  if (id === 'wave') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M2.5 12c1.8 0 1.8-6 3.6-6s1.8 12 3.6 12 1.8-9 3.6-9 1.8 7 3.6 7 1.8-4 3.6-4" />
      </svg>
    );
  }
  if (id === 'radial') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
      </svg>
    );
  }
  if (id === 'halo') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 4.5c4.4 0 7.2 2.8 7.2 5.4S17.8 19.5 12 19.5 4.8 12.5 4.8 9.9 7.6 4.5 12 4.5Z" />
        <circle cx="12" cy="11.5" r="2" />
        <path d="M12 2.7v1.8M20.7 7.2l-1.5 1.3M3.3 7.2l1.5 1.3" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.4" />
      <ellipse cx="12" cy="12" rx="9" ry="5.5" transform="rotate(-28 12 12)" opacity="0.5" />
      <circle cx="19.4" cy="7.8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="5.4" cy="16.6" r="1" fill="currentColor" stroke="none" opacity="0.65" />
    </svg>
  );
}

export function PresetGlyph({ id }: { id: ImagePresetId }) {
  const line = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const };
  return (
    <svg viewBox="0 0 120 68" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="119" height="67" rx="7" fill="currentColor" opacity="0.055" />
      {id === 'frame' && (
        <>
          <rect
            x="10"
            y="9"
            width="26"
            height="26"
            rx="4"
            stroke="currentColor"
            strokeOpacity="0.55"
          />
          <path
            d="M16 30 22 23l4 4 3-3 4 5"
            stroke="currentColor"
            strokeOpacity="0.45"
            strokeWidth="1.4"
          />
          <g {...line} opacity="0.32">
            <path d="M10 48h56M10 56h38" />
          </g>
          <path d="M10 61h34" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5" />
        </>
      )}
      {id === 'center' && (
        <>
          <circle cx="60" cy="23" r="14" stroke="currentColor" strokeOpacity="0.55" />
          <circle cx="60" cy="23" r="5" stroke="currentColor" strokeOpacity="0.35" />
          <g {...line} opacity="0.34">
            <path d="M36 48h48M42 56h36" />
          </g>
          <path d="M46 62h28" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5" />
        </>
      )}
      {id === 'cover' && (
        <>
          <rect x="6" y="6" width="108" height="56" rx="5" fill="currentColor" opacity="0.12" />
          <path d="M6 48c22-18 38-4 54-16s31-16 54 2v22H6Z" fill="currentColor" opacity="0.08" />
          <g {...line} opacity="0.36">
            <path d="M16 46h50M16 54h34" />
          </g>
          <path d="M16 61h28" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
        </>
      )}
      {id === 'clean' && (
        <>
          <path
            d="M10 38c9-18 15 8 24-8s15 16 24 2 15 4 24-10 14 4 18 2"
            stroke="currentColor"
            strokeOpacity="0.46"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <g {...line} opacity="0.32">
            <path d="M10 51h52M10 58h34" />
          </g>
          <path d="M10 63h30" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
