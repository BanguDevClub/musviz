import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArtworkPanel } from './components/ArtworkPanel';
import { AudioPanel, type AudioLoadingState } from './components/AudioPanel';
import { ExportDialog } from './components/ExportDialog';
import { IconChevron, IconGithub, LogoMark } from './components/Icons';
import { LabelsPanel } from './components/LabelsPanel';
import { ScenePanel } from './components/ScenePanel';
import { Stage } from './components/Stage';
import { TweaksPanel } from './components/TweaksPanel';
import { usePlayback } from './hooks/usePlayback';
import { useTheme } from './hooks/useTheme';
import { decodeAudioFile } from './lib/audio';
import { GITHUB_URL, SITE_URL } from './lib/constants';
import { persistExportSettings, readExportSettings } from './lib/exportSettings';
import { DISPLAY_FONT_URL } from './lib/font';
import { decodeImageFile, releaseImage } from './lib/image';
import { THEMES } from './lib/themes';
import { createVideoPalette, persistVideoTweaks, readVideoTweaks } from './lib/videoStyle';
import type {
  DecodedAudio,
  ExportSettings,
  ImagePresetId,
  LoadedImage,
  ProfileId,
  RenderConfig,
  ThemeId,
  VideoTweaks,
} from './types';
import { ensureDisplayFont } from './visualizer/renderer';

function titleFromFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export default function App() {
  const { theme, setTheme } = useTheme();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [profile, setProfile] = useState<ProfileId>('bars');
  const [imagePreset, setImagePreset] = useState<ImagePresetId>('frame');
  const [audio, setAudio] = useState<DecodedAudio | null>(null);
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [audioLoading, setAudioLoading] = useState<AudioLoadingState | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [fontReady, setFontReady] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(readExportSettings);
  const [videoTweaks, setVideoTweaks] = useState<VideoTweaks>(readVideoTweaks);

  const audioRequestRef = useRef(0);
  const imageRequestRef = useRef(0);
  const playback = usePlayback(audio);
  const pausePlayback = playback.pause;
  const togglePlayback = playback.toggle;
  const seekPlayback = playback.seek;
  const getPlaybackTime = playback.getTime;

  useEffect(() => {
    let cancelled = false;
    void ensureDisplayFont(DISPLAY_FONT_URL).then(() => {
      if (!cancelled) {
        setFontReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    persistExportSettings(exportSettings);
  }, [exportSettings]);

  useEffect(() => {
    persistVideoTweaks(videoTweaks);
  }, [videoTweaks]);

  useEffect(() => {
    return () => {
      releaseImage(image);
    };
  }, [image]);

  useEffect(() => {
    document.title = title.trim() ? `${title.trim()} — MusViz` : 'MusViz — Music Visualizer Studio';
  }, [title]);

  const loadAudio = useCallback(
    async (file: File) => {
      const request = audioRequestRef.current + 1;
      audioRequestRef.current = request;
      setAudioError(null);
      setAudioLoading({ name: file.name, progress: 0 });
      pausePlayback();

      try {
        const decoded = await decodeAudioFile(file, ({ progress }) => {
          if (audioRequestRef.current === request) {
            setAudioLoading({ name: file.name, progress });
          }
        });
        if (audioRequestRef.current !== request) {
          return;
        }
        setAudio(decoded);
        setAudioLoading(null);
        const fallbackTitle = decoded.tags.title ?? titleFromFileName(file.name);
        setTitle((current) => (current.trim() ? current : fallbackTitle));
        setArtist((current) => (current.trim() ? current : (decoded.tags.artist ?? '')));
      } catch (cause) {
        if (audioRequestRef.current !== request) {
          return;
        }
        setAudioLoading(null);
        setAudioError(
          cause instanceof Error ? cause.message : 'That audio file could not be decoded.',
        );
      }
    },
    [pausePlayback],
  );

  const removeAudio = useCallback(() => {
    audioRequestRef.current += 1;
    setAudioLoading(null);
    setAudioError(null);
    setAudio(null);
  }, []);

  const loadImage = useCallback(async (file: File) => {
    const request = imageRequestRef.current + 1;
    imageRequestRef.current = request;
    setImageError(null);
    try {
      const loaded = await decodeImageFile(file);
      if (imageRequestRef.current !== request) {
        releaseImage(loaded);
        return;
      }
      setImage(loaded);
    } catch (cause) {
      if (imageRequestRef.current !== request) {
        return;
      }
      setImageError(cause instanceof Error ? cause.message : 'That image could not be decoded.');
    }
  }, []);

  const removeImage = useCallback(() => {
    imageRequestRef.current += 1;
    setImageError(null);
    setImage(null);
  }, []);

  const updateSettings = useCallback((next: ExportSettings) => {
    setExportSettings(next);
  }, []);

  const videoPalette = useMemo(
    () =>
      createVideoPalette({
        accent: videoTweaks.accent,
        accent2: videoTweaks.accent2,
      }),
    [videoTweaks.accent, videoTweaks.accent2],
  );

  const config = useMemo<RenderConfig>(
    () => ({
      profile,
      imagePreset,
      title,
      artist,
      palette: videoPalette,
      tweaks: {
        background: videoTweaks.background,
        sensitivity: videoTweaks.sensitivity,
        smoothing: videoTweaks.smoothing,
        height: videoTweaks.height,
      },
    }),
    [profile, imagePreset, title, artist, videoPalette, videoTweaks],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (exportOpen) {
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"], dialog')) {
        return;
      }
      if (!audio) {
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlayback();
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const step = event.shiftKey ? 15 : 5;
        seekPlayback(getPlaybackTime() + (event.key === 'ArrowLeft' ? -step : step));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [audio, exportOpen, togglePlayback, seekPlayback, getPlaybackTime]);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href={import.meta.env.BASE_URL} aria-label="MusViz home">
            <span className="brand-mark">
              <LogoMark size={21} />
            </span>
            <span className="brand-copy">
              <span className="brand-name">MusViz</span>
              <span className="brand-tag">Studio</span>
            </span>
          </a>

          <div className="topbar-actions">
            <label
              className="theme-select"
              title="Interface theme — this does not change the video"
            >
              <span className="theme-swatch" aria-hidden="true" />
              <span className="sr-only">Interface theme</span>
              <select
                value={theme}
                onChange={(event) => setTheme(event.currentTarget.value as ThemeId)}
                aria-label="Interface theme"
              >
                {THEMES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <IconChevron size={12} />
            </label>
            <a
              className="gh-link"
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="MusViz on GitHub"
            >
              <IconGithub size={15} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <main className="workspace">
        <aside className="sidebar" aria-label="Project controls">
          <AudioPanel
            audio={audio}
            loading={audioLoading}
            error={audioError}
            onFile={(file) => void loadAudio(file)}
            onRemove={removeAudio}
          />
          <ScenePanel profile={profile} onChange={setProfile} />
          <ArtworkPanel
            image={image}
            preset={imagePreset}
            error={imageError}
            onFile={(file) => void loadImage(file)}
            onRemove={removeImage}
            onPreset={setImagePreset}
          />
          <TweaksPanel value={videoTweaks} onChange={setVideoTweaks} />
          <LabelsPanel title={title} artist={artist} onTitle={setTitle} onArtist={setArtist} />

          <div className="sidebar-footer">
            <span className="local-note">
              <span className="status-dot" />
              100% local · no uploads
            </span>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <IconGithub size={11} />
              BanguDevClub
            </a>
          </div>
        </aside>

        <section className="stage-column" aria-label="Preview and export">
          <Stage
            audio={audio}
            image={image}
            config={config}
            playback={playback}
            audioLoading={audioLoading}
            audioError={audioError}
            fontReady={fontReady}
            exportSettings={exportSettings}
            onAudioFile={(file) => void loadAudio(file)}
            onImageFile={(file) => void loadImage(file)}
            onOpenExport={() => setExportOpen(true)}
          />
        </section>
      </main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <span>
            MusViz is an open-source music visualizer by{' '}
            <a href="https://github.com/BanguDevClub" target="_blank" rel="noreferrer">
              BanguDevClub
            </a>
            . Your media never leaves this tab.
          </span>
          <span>
            <a href={SITE_URL} target="_blank" rel="noreferrer">
              Live app
            </a>{' '}
            · React + Mediabunny + WebCodecs ·{' '}
            <a href={`${GITHUB_URL}#readme`} target="_blank" rel="noreferrer">
              How it works
            </a>
          </span>
        </div>
      </footer>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        audio={audio}
        image={image}
        config={config}
        settings={exportSettings}
        onSettingsChange={updateSettings}
        onBeforeExport={pausePlayback}
      />
    </>
  );
}
