import { useEffect, useRef } from 'react';
import type { PlaybackController } from '../hooks/usePlayback';
import { formatDuration } from '../lib/format';
import type { DecodedAudio } from '../types';
import { IconExpand, IconPause, IconPlay } from './Icons';

export function Transport({
  audio,
  playback,
  onToggleFullscreen,
}: {
  audio: DecodedAudio | null;
  playback: PlaybackController;
  onToggleFullscreen: () => void;
}) {
  const rangeRef = useRef<HTMLInputElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLSpanElement>(null);
  const scrubbingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const duration = audio?.duration ?? 0;
  const getTime = playback.getTime;

  useEffect(() => {
    const range = rangeRef.current;
    const current = currentRef.current;
    const fill = fillRef.current;
    if (!range || !current || !fill) {
      return;
    }

    let frame = 0;
    const update = () => {
      if (!scrubbingRef.current) {
        const time = getTime();
        range.value = String(time);
        current.textContent = formatDuration(time);
        const percent = duration > 0 ? (time / duration) * 100 : 0;
        fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frame);
  }, [duration, getTime]);

  useEffect(() => {
    const range = rangeRef.current;
    const current = currentRef.current;
    const fill = fillRef.current;
    if (!range || !current || !fill) {
      return;
    }
    range.value = '0';
    current.textContent = formatDuration(0);
    fill.style.width = '0%';
  }, [audio]);

  const startScrub = () => {
    scrubbingRef.current = true;
    wasPlayingRef.current = playback.playing;
    if (playback.playing) {
      playback.pause();
    }
  };

  const finishScrub = () => {
    if (!scrubbingRef.current) {
      return;
    }
    scrubbingRef.current = false;
    const range = rangeRef.current;
    if (!range) {
      return;
    }
    const time = Number(range.value);
    if (currentRef.current) {
      currentRef.current.textContent = formatDuration(time);
    }
    if (wasPlayingRef.current && time < duration - 0.05) {
      playback.play();
    }
    wasPlayingRef.current = false;
  };

  return (
    <div className="transport">
      <button
        type="button"
        className="play-button"
        onClick={playback.toggle}
        disabled={!audio}
        aria-label={playback.playing ? 'Pause' : 'Play'}
        title={playback.playing ? 'Pause (Space)' : 'Play (Space)'}
      >
        {playback.playing ? <IconPause size={18} /> : <IconPlay size={18} />}
      </button>

      <div className={`scrub${audio ? '' : ' is-disabled'}`}>
        <div className="range">
          <span className="range-track">
            <span className="range-fill" ref={fillRef} />
          </span>
          <input
            ref={rangeRef}
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            defaultValue={0}
            disabled={!audio}
            aria-label="Seek through the track"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              startScrub();
            }}
            onPointerUp={finishScrub}
            onPointerCancel={finishScrub}
            onChange={(event) => {
              const time = Number(event.currentTarget.value);
              playback.seek(time);
              if (currentRef.current) {
                currentRef.current.textContent = formatDuration(time);
              }
              const percent = duration > 0 ? (time / duration) * 100 : 0;
              if (fillRef.current) {
                fillRef.current.style.width = `${percent}%`;
              }
            }}
          />
        </div>
        <div className="scrub-times">
          <span>
            <strong ref={currentRef}>0:00</strong> / {formatDuration(duration)}
          </span>
          <span>{audio ? `${(audio.sampleRate / 1000).toFixed(1)} kHz` : 'No track'}</span>
        </div>
      </div>

      <div className="transport-extra">
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={onToggleFullscreen}
          aria-label="Toggle fullscreen preview"
          title="Fullscreen preview"
        >
          <IconExpand size={15} />
        </button>
      </div>
    </div>
  );
}
