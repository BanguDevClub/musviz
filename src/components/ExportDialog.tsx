import { useEffect, useMemo, useRef, useState } from 'react';
import type { AudioCodec, VideoCodec } from 'mediabunny';
import { ExportCancelledError, startExport, type ExportTask } from '../export/runExport';
import {
  AUDIO_CODEC_LABELS,
  CONTAINERS,
  FPS_OPTIONS,
  QUALITY_OPTIONS,
  RESOLUTIONS,
  VIDEO_CODEC_LABELS,
} from '../lib/constants';
import {
  createOutputFormat,
  pickAudioCodec,
  pickVideoCodec,
  probeAudioCodecs,
  probeVideoCodecs,
} from '../lib/codecs';
import {
  formatBytes,
  formatChannels,
  formatDuration,
  formatFrameCount,
  formatSampleRate,
} from '../lib/format';
import type {
  ContainerId,
  SaveMode,
  DecodedAudio,
  ExportProgress,
  ExportResult,
  ExportSettings,
  FpsId,
  LoadedImage,
  RenderConfig,
} from '../types';
import { IconAlert, IconCheck, IconChevron, IconClose, IconDownload, IconInfo } from './Icons';

type View = 'settings' | 'running' | 'done' | 'error';

type CodecOption<T extends string> = {
  value: T;
  label: string;
  disabled: boolean;
};

function CodecSelect<T extends string>({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: CodecOption<T>[];
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="select">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value as T)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
              {option.disabled ? ' — unavailable' : ''}
            </option>
          ))}
        </select>
        <IconChevron size={14} />
      </div>
    </div>
  );
}

function triggerDownload(url: string, name: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

const PHASES: { id: ExportProgress['phase']; label: string }[] = [
  { id: 'preparing', label: 'Prepare' },
  { id: 'audio', label: 'Audio' },
  { id: 'rendering', label: 'Render' },
  { id: 'finalizing', label: 'Finalize' },
];

const PHASE_LABEL: Record<ExportProgress['phase'], string> = {
  preparing: 'Preparing the encoder',
  audio: 'Encoding the audio track',
  rendering: 'Rendering frames',
  finalizing: 'Finalizing the file',
};

export function ExportDialog({
  open,
  onClose,
  audio,
  image,
  config,
  settings,
  onSettingsChange,
  onBeforeExport,
}: {
  open: boolean;
  onClose: () => void;
  audio: DecodedAudio | null;
  image: LoadedImage | null;
  config: RenderConfig;
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
  onBeforeExport: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const taskRef = useRef<ExportTask | null>(null);
  const [view, setView] = useState<View>('settings');
  const [probing, setProbing] = useState(false);
  const [availableVideo, setAvailableVideo] = useState<VideoCodec[] | null>(null);
  const [availableAudio, setAvailableAudio] = useState<AudioCodec[] | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const resolution = useMemo(
    () => RESOLUTIONS.find((item) => item.id === settings.height) ?? RESOLUTIONS[1]!,
    [settings.height],
  );
  const container = useMemo(
    () => CONTAINERS.find((item) => item.id === settings.container) ?? CONTAINERS[0]!,
    [settings.container],
  );
  const format = useMemo(() => createOutputFormat(settings.container), [settings.container]);
  const allVideo = useMemo(() => format.getSupportedVideoCodecs(), [format]);
  const allAudio = useMemo(() => format.getSupportedAudioCodecs(), [format]);
  const channels = Math.min(2, audio?.numberOfChannels ?? 2);
  const supportsEncoding =
    typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';
  const usesSavePicker = typeof Reflect.get(window, 'showSaveFilePicker') === 'function';
  const preferredVideo: VideoCodec = settings.container === 'webm' ? 'vp9' : 'avc';
  const preferredAudio: AudioCodec = settings.container === 'webm' ? 'opus' : 'aac';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      setView('settings');
      setProgress(null);
      setResult(null);
      setError(null);
      setNotice(null);
      setCancelling(false);
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) {
      taskRef.current?.cancel();
      taskRef.current = null;
      setView('settings');
      setProgress(null);
      setResult(null);
      setError(null);
      setNotice(null);
      setCancelling(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      bodyRef.current?.scrollTo({ top: 0 });
    }
  }, [open, view]);

  useEffect(() => {
    const url = result?.url;
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [result]);

  useEffect(
    () => () => {
      taskRef.current?.cancel();
      taskRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    let stale = false;
    setProbing(true);
    setProbeError(null);
    Promise.all([
      probeVideoCodecs(
        settings.container,
        resolution.width,
        resolution.height,
        settings.fps,
        settings.quality,
      ),
      probeAudioCodecs(settings.container, channels),
    ])
      .then(([videoCodecs, audioCodecs]) => {
        if (stale) {
          return;
        }
        setAvailableVideo(videoCodecs);
        setAvailableAudio(audioCodecs);
        if (videoCodecs.length === 0) {
          setProbeError(
            `Your browser can't encode video in ${container.name}. Try another container or resolution.`,
          );
        } else if (audioCodecs.length === 0) {
          setProbeError(`Your browser can't encode audio in ${container.name}.`);
        }
      })
      .catch(() => {
        if (!stale) {
          setAvailableVideo([]);
          setAvailableAudio([]);
          setProbeError('Could not initialize the media encoders in this browser.');
        }
      })
      .finally(() => {
        if (!stale) {
          setProbing(false);
        }
      });
    return () => {
      stale = true;
    };
  }, [
    open,
    settings.container,
    settings.fps,
    settings.quality,
    resolution.width,
    resolution.height,
    channels,
    container.name,
  ]);

  useEffect(() => {
    if (open && !usesSavePicker && settings.saveMode === 'picker') {
      onSettingsChange({ ...settings, saveMode: 'download' });
    }
  }, [open, usesSavePicker, settings, onSettingsChange]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const supportedVideo = format.getSupportedVideoCodecs();
    const supportedAudio = format.getSupportedAudioCodecs();
    const nextVideo = supportedVideo.includes(settings.videoCodec)
      ? settings.videoCodec
      : pickVideoCodec(supportedVideo, preferredVideo);
    const nextAudio = supportedAudio.includes(settings.audioCodec)
      ? settings.audioCodec
      : pickAudioCodec(supportedAudio, preferredAudio);
    if (
      (nextVideo && nextVideo !== settings.videoCodec) ||
      (nextAudio && nextAudio !== settings.audioCodec)
    ) {
      onSettingsChange({
        ...settings,
        videoCodec: nextVideo ?? settings.videoCodec,
        audioCodec: nextAudio ?? settings.audioCodec,
      });
    }
  }, [open, format, settings, preferredVideo, preferredAudio, onSettingsChange]);

  useEffect(() => {
    if (!availableVideo || !availableAudio) {
      return;
    }
    const nextVideo = availableVideo.includes(settings.videoCodec)
      ? settings.videoCodec
      : pickVideoCodec(availableVideo, preferredVideo);
    const nextAudio = availableAudio.includes(settings.audioCodec)
      ? settings.audioCodec
      : pickAudioCodec(availableAudio, preferredAudio);
    if (
      (nextVideo && nextVideo !== settings.videoCodec) ||
      (nextAudio && nextAudio !== settings.audioCodec)
    ) {
      onSettingsChange({
        ...settings,
        videoCodec: nextVideo ?? settings.videoCodec,
        audioCodec: nextAudio ?? settings.audioCodec,
      });
    }
  }, [availableVideo, availableAudio, settings, preferredVideo, preferredAudio, onSettingsChange]);

  const changeContainer = (nextContainer: ContainerId) => {
    const nextFormat = createOutputFormat(nextContainer);
    const supportedVideo = nextFormat.getSupportedVideoCodecs();
    const supportedAudio = nextFormat.getSupportedAudioCodecs();
    onSettingsChange({
      ...settings,
      container: nextContainer,
      videoCodec:
        pickVideoCodec(supportedVideo, nextContainer === 'webm' ? 'vp9' : 'avc') ??
        settings.videoCodec,
      audioCodec:
        pickAudioCodec(supportedAudio, nextContainer === 'webm' ? 'opus' : 'aac') ??
        settings.audioCodec,
    });
  };

  const canStart =
    Boolean(audio) &&
    supportsEncoding &&
    !probing &&
    Boolean(availableVideo?.length) &&
    Boolean(availableAudio?.length) &&
    Boolean(availableVideo?.includes(settings.videoCodec)) &&
    Boolean(availableAudio?.includes(settings.audioCodec));

  const videoOptions: CodecOption<VideoCodec>[] = allVideo.map((codec) => ({
    value: codec,
    label: VIDEO_CODEC_LABELS[codec] ?? codec,
    disabled: Boolean(availableVideo) && !availableVideo!.includes(codec),
  }));
  if (!allVideo.includes(settings.videoCodec)) {
    videoOptions.push({
      value: settings.videoCodec,
      label: VIDEO_CODEC_LABELS[settings.videoCodec] ?? settings.videoCodec,
      disabled: true,
    });
  }
  const audioOptions: CodecOption<AudioCodec>[] = allAudio.map((codec) => ({
    value: codec,
    label: AUDIO_CODEC_LABELS[codec] ?? codec,
    disabled: Boolean(availableAudio) && !availableAudio!.includes(codec),
  }));
  if (!allAudio.includes(settings.audioCodec)) {
    audioOptions.push({
      value: settings.audioCodec,
      label: AUDIO_CODEC_LABELS[settings.audioCodec] ?? settings.audioCodec,
      disabled: true,
    });
  }

  const requestClose = () => {
    if (view === 'running') {
      return;
    }
    setView('settings');
    setResult(null);
    setError(null);
    setNotice(null);
    onClose();
  };

  const handleExport = async () => {
    if (!audio || !canStart) {
      return;
    }
    onBeforeExport();
    setError(null);
    setNotice(null);
    setProgress(null);
    setResult(null);
    setView('running');
    setCancelling(false);

    try {
      const task = await startExport({
        audio,
        image,
        config,
        settings,
        onProgress: setProgress,
      });
      taskRef.current = task;
      const output = await task.promise;
      taskRef.current = null;
      setResult(output);
      setView('done');
      if (output.url) {
        triggerDownload(output.url, output.name);
      }
    } catch (cause) {
      taskRef.current = null;
      if (cause instanceof ExportCancelledError) {
        setView('settings');
        setNotice('Export cancelled. Your settings are still here.');
      } else {
        setView('error');
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      setCancelling(false);
    }
  };

  const cancelExport = () => {
    if (!taskRef.current) {
      return;
    }
    setCancelling(true);
    taskRef.current.cancel();
  };

  const progressPercent = Math.round(Math.min(1, Math.max(0, progress?.progress ?? 0)) * 100);
  const activePhaseIndex = progress ? PHASES.findIndex((phase) => phase.id === progress.phase) : 0;
  const frameCount = formatFrameCount(audio?.duration ?? 0, settings.fps);

  return (
    <dialog
      ref={dialogRef}
      className="export-dialog"
      aria-labelledby="export-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          requestClose();
        }
      }}
    >
      <div className="export-sheet">
        <header className="export-head">
          <div>
            <h2 className="export-title" id="export-dialog-title">
              Export video
            </h2>
            <p className="export-subtitle">Rendered on your device in a background worker.</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={requestClose}
            disabled={view === 'running'}
            aria-label="Close export dialog"
            title={view === 'running' ? 'Cancel the export first' : 'Close'}
          >
            <IconClose size={16} />
          </button>
        </header>

        <div className="export-body" ref={bodyRef}>
          {view === 'settings' && (
            <>
              {notice ? (
                <div className="alert alert-info" role="status">
                  <IconInfo size={14} />
                  <span>{notice}</span>
                </div>
              ) : null}
              {!audio ? (
                <div className="alert" role="alert">
                  <IconAlert size={14} />
                  <span>Load an audio track before exporting.</span>
                </div>
              ) : null}
              {!supportsEncoding ? (
                <div className="alert" role="alert">
                  <IconAlert size={14} />
                  <span>
                    This browser does not expose the WebCodecs encoders MusViz needs. Chrome, Edge,
                    and recent Safari versions are supported.
                  </span>
                </div>
              ) : null}
              {probeError ? (
                <div className="alert" role="alert">
                  <IconAlert size={14} />
                  <span>{probeError}</span>
                </div>
              ) : null}

              <div className="export-grid">
                <div className="field">
                  <label className="field-label" htmlFor="export-container">
                    Container
                  </label>
                  <div className="select">
                    <select
                      id="export-container"
                      value={settings.container}
                      onChange={(event) =>
                        changeContainer(event.currentTarget.value as ContainerId)
                      }
                    >
                      {CONTAINERS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — {item.description}
                        </option>
                      ))}
                    </select>
                    <IconChevron size={14} />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="export-quality">
                    Video quality
                  </label>
                  <div className="select">
                    <select
                      id="export-quality"
                      value={settings.quality}
                      onChange={(event) =>
                        onSettingsChange({
                          ...settings,
                          quality: event.currentTarget.value as ExportSettings['quality'],
                        })
                      }
                    >
                      {QUALITY_OPTIONS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <IconChevron size={14} />
                  </div>
                </div>

                <div className="field span-2">
                  <span className="field-label">Resolution</span>
                  <div className="option-cards" role="group" aria-label="Export resolution">
                    {RESOLUTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="option-card"
                        aria-pressed={settings.height === item.id}
                        onClick={() => onSettingsChange({ ...settings, height: item.id })}
                      >
                        <strong>{item.label}</strong>
                        <span>
                          {item.width} × {item.height}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <span className="field-label">Frame rate</span>
                  <div className="segmented" role="group" aria-label="Export frame rate">
                    {FPS_OPTIONS.map((fps) => (
                      <button
                        key={fps}
                        type="button"
                        aria-pressed={settings.fps === fps}
                        onClick={() => onSettingsChange({ ...settings, fps: fps as FpsId })}
                      >
                        {fps} fps
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <span className="field-label">Source audio</span>
                  <div className="info-box">
                    <strong>
                      {audio
                        ? `${formatSampleRate(audio.sampleRate)} · ${formatChannels(audio.numberOfChannels)}`
                        : 'No audio loaded'}
                    </strong>
                    <span>
                      {audio && audio.sampleRate !== 48000
                        ? 'Resampled to 48 kHz during encoding'
                        : 'Encoded at 48 kHz · high quality'}
                    </span>
                  </div>
                </div>

                <CodecSelect
                  id="export-video-codec"
                  label="Video codec"
                  value={settings.videoCodec}
                  options={videoOptions}
                  disabled={probing}
                  onChange={(videoCodec) => onSettingsChange({ ...settings, videoCodec })}
                />

                <CodecSelect
                  id="export-audio-codec"
                  label="Audio codec"
                  value={settings.audioCodec}
                  options={audioOptions}
                  disabled={probing}
                  onChange={(audioCodec) => onSettingsChange({ ...settings, audioCodec })}
                />

                <div className="field span-2">
                  <span className="field-label">Delivery</span>
                  <div className="segmented" role="group" aria-label="Export delivery method">
                    <button
                      type="button"
                      aria-pressed={settings.saveMode === 'download'}
                      onClick={() =>
                        onSettingsChange({ ...settings, saveMode: 'download' as SaveMode })
                      }
                    >
                      Browser download
                    </button>
                    {usesSavePicker ? (
                      <button
                        type="button"
                        aria-pressed={settings.saveMode === 'picker'}
                        onClick={() =>
                          onSettingsChange({ ...settings, saveMode: 'picker' as SaveMode })
                        }
                      >
                        Choose a folder
                      </button>
                    ) : null}
                  </div>
                  <span className="field-hint">
                    {settings.saveMode === 'picker' && usesSavePicker
                      ? 'Writes directly to disk, ideal for 4K files.'
                      : 'The finished file downloads automatically.'}
                  </span>
                </div>

                <div className="export-summary span-2">
                  <strong>
                    {resolution.width} × {resolution.height}
                  </strong>
                  <span className="summary-dot" />
                  <strong>{settings.fps} fps</strong>
                  <span className="summary-dot" />
                  <span>{formatDuration(audio?.duration ?? 0)}</span>
                  <span className="summary-dot" />
                  <span>{frameCount}</span>
                  <span className="summary-dot" />
                  <span>{container.name}</span>
                  <span className="summary-dot" />
                  <span>
                    {VIDEO_CODEC_LABELS[settings.videoCodec] ?? settings.videoCodec} +{' '}
                    {AUDIO_CODEC_LABELS[settings.audioCodec] ?? settings.audioCodec}
                  </span>
                </div>

                <div className="export-note span-2">
                  <IconInfo size={13} />
                  <span>
                    {probing
                      ? 'Checking which codecs your browser can encode…'
                      : settings.saveMode === 'picker' && usesSavePicker
                        ? 'A save dialog opens next. Large 4K files stream directly to disk.'
                        : 'Your video downloads automatically when rendering finishes.'}{' '}
                    Keep this tab open while it works.
                  </span>
                </div>
              </div>
            </>
          )}

          {view === 'running' && (
            <div className="export-progress" aria-live="polite">
              <div className="progress-visual">
                <div className="progress-visual-copy">
                  <h3>{progress ? PHASE_LABEL[progress.phase] : 'Preparing export'}</h3>
                  <p>
                    {progress
                      ? progress.phase === 'rendering' && progress.totalFrames > 0
                        ? `${progress.frame.toLocaleString()} of ${progress.totalFrames.toLocaleString()} frames`
                        : 'Working locally through WebCodecs'
                      : usesSavePicker
                        ? 'Choose a save location to begin.'
                        : 'Waking up the encoder.'}
                  </p>
                </div>
                <span className="progress-number">{progressPercent}%</span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
              >
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(1, progressPercent)}%` }}
                />
              </div>
              <div className="progress-meta">
                <span>
                  {resolution.width} × {resolution.height} · {settings.fps} fps
                </span>
                <span>
                  {container.name} ·{' '}
                  {VIDEO_CODEC_LABELS[settings.videoCodec] ?? settings.videoCodec}
                </span>
              </div>
              <div className="progress-steps">
                {PHASES.map((phase, index) => (
                  <span
                    key={phase.id}
                    className={`progress-step${
                      index === activePhaseIndex && progress ? ' is-active' : ''
                    }${index < activePhaseIndex ? ' is-done' : ''}`}
                  >
                    <span className="progress-step-dot" />
                    {phase.label}
                  </span>
                ))}
              </div>
              <div className="export-note">
                <IconInfo size={13} />
                <span>
                  Encoding is CPU and GPU intensive. For the smoothest experience, avoid heavy
                  multitasking while this tab renders.
                </span>
              </div>
            </div>
          )}

          {view === 'done' && result && (
            <div className="export-success">
              <span className="success-icon">
                <IconCheck size={26} />
              </span>
              <h3>{result.savedToDisk ? 'Saved to your disk' : 'Your video is ready'}</h3>
              <p>{result.name}</p>
              <div className="file-meta">
                <span>{formatBytes(result.size)}</span>
                <span>·</span>
                <span>
                  {resolution.width} × {resolution.height}
                </span>
                <span>·</span>
                <span>{settings.fps} fps</span>
                <span>·</span>
                <span>{container.name}</span>
              </div>
              {result.url ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => triggerDownload(result.url!, result.name)}
                >
                  <IconDownload size={15} />
                  Download again
                </button>
              ) : (
                <p style={{ color: 'var(--faint)', fontSize: 11 }}>
                  The file was written directly to the location you chose.
                </p>
              )}
            </div>
          )}

          {view === 'error' && (
            <div className="export-error-view" aria-live="assertive">
              <h3>Export failed</h3>
              <div className="alert" role="alert">
                <IconAlert size={14} />
                <span>{error ?? 'An unknown error occurred while encoding.'}</span>
              </div>
              <p className="panel-hint">
                Try a lower resolution or a different codec. If the problem persists, reload the
                page and export again.
              </p>
            </div>
          )}
        </div>

        <footer className="export-foot">
          <span className="export-foot-meta">
            {view === 'settings'
              ? probing
                ? 'Detecting your browser encoders…'
                : `${frameCount} · ${formatDuration(audio?.duration ?? 0)}`
              : view === 'running'
                ? cancelling
                  ? 'Stopping the encoder…'
                  : 'Rendering locally — no uploads'
                : view === 'done'
                  ? 'Export complete'
                  : 'Nothing was written'}
          </span>

          <div className="export-actions">
            {view === 'settings' && (
              <>
                <button type="button" className="btn btn-secondary" onClick={requestClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleExport()}
                  disabled={!canStart}
                >
                  {probing ? <span className="spinner" /> : <IconDownload size={15} />}
                  {probing ? 'Checking codecs' : 'Start export'}
                </button>
              </>
            )}

            {view === 'running' && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={cancelExport}
                disabled={cancelling}
              >
                {cancelling ? <span className="spinner" /> : null}
                {cancelling ? 'Cancelling…' : 'Cancel export'}
              </button>
            )}

            {view === 'done' && (
              <button type="button" className="btn btn-primary" onClick={requestClose}>
                Done
              </button>
            )}

            {view === 'error' && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setView('settings');
                  setError(null);
                }}
              >
                Back to settings
              </button>
            )}
          </div>
        </footer>
      </div>
    </dialog>
  );
}
