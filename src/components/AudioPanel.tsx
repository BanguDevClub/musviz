import { useRef, useState } from 'react';
import type { DecodedAudio } from '../types';
import { AUDIO_CODEC_LABELS } from '../lib/constants';
import { formatChannels, formatDuration, formatSampleRate } from '../lib/format';
import { IconAlert, IconAudio, IconReplace, IconTrash, IconUpload } from './Icons';
import { MiniWaveform } from './MiniWaveform';

export type AudioLoadingState = {
  name: string;
  progress: number;
};

export function AudioPanel({
  audio,
  loading,
  error,
  onFile,
  onRemove,
}: {
  audio: DecodedAudio | null;
  loading: AudioLoadingState | null;
  error: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = () => inputRef.current?.click();

  return (
    <section className="panel" aria-labelledby="audio-panel-title">
      <div className="panel-head">
        <div className="panel-heading">
          <span className="panel-step">01</span>
          <h2 className="panel-title" id="audio-panel-title">
            Track
          </h2>
        </div>
        <span className="panel-badge">
          <span className={`status-dot${loading ? ' is-busy' : ''}`} />
          {loading ? 'Decoding' : audio ? 'Ready' : 'Waiting'}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/mp4,video/webm,video/quicktime,video/x-matroska,.mkv"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFile(file);
          }
          event.target.value = '';
        }}
      />

      {loading ? (
        <div className="track-box">
          <div className="track-main">
            <div className="track-badge">
              <span className="spinner" />
            </div>
            <div className="track-info">
              <p className="track-name">Decoding {loading.name}</p>
              <p className="track-meta">
                <span>WebCodecs</span>
                <span>{Math.round(loading.progress * 100)}%</span>
              </p>
            </div>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(loading.progress * 100)}
          >
            <div
              className="progress-fill"
              style={{ width: `${Math.max(3, loading.progress * 100)}%` }}
            />
          </div>
        </div>
      ) : audio ? (
        <div className="track-box">
          <div className="track-main">
            <div className="track-badge">
              <IconAudio size={20} />
            </div>
            <div className="track-info">
              <p className="track-name" title={audio.name}>
                {audio.name}
              </p>
              <p className="track-meta">
                <span>{formatDuration(audio.duration)}</span>
                <span>{formatSampleRate(audio.sampleRate)}</span>
                <span>{formatChannels(audio.numberOfChannels)}</span>
                {audio.codec ? (
                  <span>{AUDIO_CODEC_LABELS[audio.codec] ?? audio.codec.toUpperCase()}</span>
                ) : null}
              </p>
            </div>
            <div className="track-actions">
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={pick}
                aria-label="Replace audio file"
                title="Replace audio"
              >
                <IconReplace size={15} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={onRemove}
                aria-label="Remove audio file"
                title="Remove audio"
              >
                <IconTrash size={15} />
              </button>
            </div>
          </div>
          <MiniWaveform peaks={audio.peaks} />
        </div>
      ) : (
        <button
          type="button"
          className={`dropzone${dragging ? ' is-dragging' : ''}`}
          onClick={pick}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) {
              onFile(file);
            }
          }}
        >
          <span className="dropzone-icon">
            <IconUpload size={18} />
          </span>
          <strong>Drop an audio file</strong>
          <span>or click to browse · MP3, WAV, FLAC, AAC, OGG, M4A</span>
        </button>
      )}

      {error ? (
        <div className="alert track-error" role="alert">
          <IconAlert size={14} />
          <span>{error}</span>
        </div>
      ) : (
        <p className="panel-hint" style={{ marginTop: 10 }}>
          Decoded locally with Mediabunny and WebCodecs. Tracks up to 15 minutes. Nothing is
          uploaded.
        </p>
      )}
    </section>
  );
}
