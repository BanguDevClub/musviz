import { useEffect, useRef } from 'react';
import type { DecodedAudio, LoadedImage, RenderConfig } from '../types';
import { VisualizerRenderer } from '../visualizer/renderer';
import type { PlaybackController } from '../hooks/usePlayback';

const PREVIEW_WIDTH = 1600;
const PREVIEW_HEIGHT = 900;

export function PreviewCanvas({
  audio,
  image,
  config,
  playback,
  fontReady,
}: {
  audio: DecodedAudio | null;
  image: LoadedImage | null;
  config: RenderConfig;
  playback: PlaybackController;
  fontReady: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<VisualizerRenderer | null>(null);
  const dirtyRef = useRef(true);
  const audioRef = useRef(audio);
  const imageRef = useRef(image);
  const configRef = useRef(config);
  const playingRef = useRef(playback.playing);
  const getTimeRef = useRef(playback.getTime);

  useEffect(() => {
    audioRef.current = audio;
    imageRef.current = image;
    configRef.current = config;
    playingRef.current = playback.playing;
    getTimeRef.current = playback.getTime;
  }, [audio, image, config, playback.playing, playback.getTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      return;
    }

    const renderer = new VisualizerRenderer(
      PREVIEW_WIDTH,
      PREVIEW_HEIGHT,
      configRef.current,
      imageRef.current?.bitmap ?? null,
      audioRef.current,
    );
    rendererRef.current = renderer;
    dirtyRef.current = true;

    let frame = 0;
    let lastTime = Number.NaN;

    const loop = () => {
      const current = rendererRef.current;
      if (current && context) {
        const time = audioRef.current ? getTimeRef.current() : (performance.now() / 1000) * 0.42;
        const shouldDraw =
          dirtyRef.current ||
          playingRef.current ||
          !audioRef.current ||
          Math.abs(time - lastTime) > 1e-4;
        if (shouldDraw) {
          current.draw(context, time);
          lastTime = time;
          dirtyRef.current = false;
        }
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.update(config, image?.bitmap ?? null);
    dirtyRef.current = true;
  }, [config, image]);

  useEffect(() => {
    rendererRef.current?.setAnalysis(audio);
    dirtyRef.current = true;
  }, [audio]);

  useEffect(() => {
    dirtyRef.current = true;
  }, [fontReady]);

  return (
    <canvas
      ref={canvasRef}
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      aria-label="Live music visual preview"
      role="img"
    />
  );
}
