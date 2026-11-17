import { useRef, useState } from 'react';
import type { AudioLoadingState } from './AudioPanel';
import type { PlaybackController } from '../hooks/usePlayback';
import { IMAGE_PRESETS, PROFILES } from '../lib/constants';
import { formatDuration } from '../lib/format';
import type { DecodedAudio, ExportSettings, LoadedImage, RenderConfig } from '../types';
import { IconAlert, IconDownload, IconSpark, IconUpload } from './Icons';
import { PreviewCanvas } from './PreviewCanvas';
import { Transport } from './Transport';

export function Stage({
  audio,
  image,
  config,
  playback,
  audioLoading,
  audioError,
  fontReady,
  exportSettings,
  onAudioFile,
  onImageFile,
  onOpenExport,
}: {
  audio: DecodedAudio | null;
  image: LoadedImage | null;
  config: RenderConfig;
  playback: PlaybackController;
  audioLoading: AudioLoadingState | null;
  audioError: string | null;
  fontReady: boolean;
  exportSettings: ExportSettings;
  onAudioFile: (file: File) => void;
  onImageFile: (file: File) => void;
  onOpenExport: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const profileName = PROFILES.find((item) => item.id === config.profile)?.name ?? '';
  const presetName = IMAGE_PRESETS.find((item) => item.id === config.imagePreset)?.name ?? '';

  const toggleFullscreen = () => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void frame.requestFullscreen().catch(() => {
        // Fullscreen can be blocked by browser policy; the preview remains usable.
      });
    }
  };

  return (
    <>
      <div className="stage-topline">
        <span className="live-badge">
          <span className="live-dot" />
          Live preview
        </span>
        <div className="stage-tags">
          <span className="tag">{profileName}</span>
          <span className="tag">{presetName}</span>
          <span className="tag">16:9</span>
        </div>
      </div>

      <div
        className={`stage-frame${dragging ? ' is-dragging' : ''}`}
        ref={frameRef}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
            return;
          }
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (!file) {
            return;
          }
          if (file.type.startsWith('image/')) {
            onImageFile(file);
          } else {
            onAudioFile(file);
          }
        }}
      >
        <PreviewCanvas
          audio={audio}
          image={image}
          config={config}
          playback={playback}
          fontReady={fontReady}
        />

        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/mp4,video/webm,video/quicktime,video/x-matroska,.mkv"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onAudioFile(file);
            }
            event.target.value = '';
          }}
        />

        {!audio ? (
          <div className="stage-overlay">
            <div className="overlay-card">
              <div className="overlay-icon">
                {audioLoading ? <span className="spinner" /> : <IconSpark size={21} />}
              </div>
              {audioLoading ? (
                <>
                  <h2>Decoding your track</h2>
                  <p>{audioLoading.name}</p>
                  <div className="overlay-progress">
                    <p>
                      <span>Reading audio with WebCodecs</span>
                      <strong>{Math.round(audioLoading.progress * 100)}%</strong>
                    </p>
                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(audioLoading.progress * 100)}
                    >
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.max(3, audioLoading.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2>Give it a soundtrack</h2>
                  {audioError ? (
                    <div className="alert" role="alert">
                      <IconAlert size={14} />
                      <span>{audioError}</span>
                    </div>
                  ) : (
                    <p>
                      Drop a track here, or choose one below. It becomes a looping visual you can
                      export up to 4K.
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => inputRef.current?.click()}
                  >
                    <IconUpload size={15} />
                    Choose audio
                  </button>
                  <p className="overlay-note">
                    MP3, WAV, FLAC, AAC, OGG, M4A · processed on your device
                  </p>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <Transport audio={audio} playback={playback} onToggleFullscreen={toggleFullscreen} />

      {playback.error ? (
        <div className="alert" role="alert">
          <IconAlert size={14} />
          <span>{playback.error}</span>
        </div>
      ) : null}

      <div className="stage-foot">
        <div className="stage-hint">
          <span>
            <kbd>Space</kbd> play / pause
          </span>
          <span>
            <kbd>Left</kbd>
            <kbd>Right</kbd> seek
          </span>
          {audio ? (
            <span>
              {formatDuration(audio.duration)} · {audio.sampleRate / 1000} kHz
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="export-cta"
          onClick={onOpenExport}
          disabled={!audio || Boolean(audioLoading)}
        >
          <IconDownload size={16} />
          <span className="export-cta-copy">
            Export video
            <span>
              {exportSettings.height}p · {exportSettings.fps} fps ·{' '}
              {exportSettings.container.toUpperCase()}
            </span>
          </span>
        </button>
      </div>
    </>
  );
}
