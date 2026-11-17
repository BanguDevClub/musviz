import { useCallback, useEffect, useRef, useState } from 'react';
import { createPlaybackBuffer } from '../lib/audio';
import type { DecodedAudio } from '../types';

export type PlaybackController = {
  playing: boolean;
  duration: number;
  error: string | null;
  getTime: () => number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
};

export function usePlayback(audio: DecodedAudio | null): PlaybackController {
  const contextRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<{ audio: DecodedAudio; buffer: AudioBuffer } | null>(null);
  const offsetRef = useRef(0);
  const startedAtRef = useRef(0);
  const playingRef = useRef(false);
  const generationRef = useRef(0);
  const audioRef = useRef(audio);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopNode = useCallback(() => {
    const node = nodeRef.current;
    nodeRef.current = null;
    if (!node) {
      return;
    }
    node.onended = null;
    try {
      node.stop();
    } catch {
      // A source can only be stopped once; ignore the duplicate stop.
    }
    node.disconnect();
  }, []);

  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);

  useEffect(() => {
    generationRef.current += 1;
    stopNode();
    offsetRef.current = 0;
    playingRef.current = false;
    bufferRef.current = null;
    setPlaying(false);
    setError(null);
  }, [audio, stopNode]);

  useEffect(
    () => () => {
      generationRef.current += 1;
      stopNode();
      const context = contextRef.current;
      contextRef.current = null;
      if (context) {
        void context.close();
      }
    },
    [stopNode],
  );

  const getTime = useCallback(() => {
    const duration = audioRef.current?.duration ?? 0;
    const context = contextRef.current;
    if (!playingRef.current || !context) {
      return Math.min(offsetRef.current, duration);
    }
    return Math.min(duration, offsetRef.current + (context.currentTime - startedAtRef.current));
  }, []);

  const startAt = useCallback(
    async (position: number) => {
      const currentAudio = audioRef.current;
      if (!currentAudio) {
        return;
      }
      const generation = generationRef.current + 1;
      generationRef.current = generation;

      const clamped = Math.max(0, Math.min(position, currentAudio.duration));
      stopNode();
      if (clamped >= currentAudio.duration) {
        offsetRef.current = currentAudio.duration;
        playingRef.current = false;
        setPlaying(false);
        return;
      }

      try {
        let context = contextRef.current;
        if (!context) {
          context = new AudioContext({ latencyHint: 'playback' });
          contextRef.current = context;
        }
        if (context.state === 'suspended') {
          await context.resume();
        }
        if (generationRef.current !== generation) {
          return;
        }

        let cached = bufferRef.current;
        if (!cached || cached.audio !== currentAudio) {
          cached = { audio: currentAudio, buffer: createPlaybackBuffer(context, currentAudio) };
          bufferRef.current = cached;
        }

        const source = context.createBufferSource();
        source.buffer = cached.buffer;
        source.connect(context.destination);
        source.onended = () => {
          if (nodeRef.current !== source || !playingRef.current) {
            return;
          }
          nodeRef.current = null;
          offsetRef.current = currentAudio.duration;
          playingRef.current = false;
          setPlaying(false);
          source.disconnect();
        };
        source.start(0, clamped);
        nodeRef.current = source;
        offsetRef.current = clamped;
        startedAtRef.current = context.currentTime;
        playingRef.current = true;
        setPlaying(true);
        setError(null);
      } catch (cause) {
        playingRef.current = false;
        setPlaying(false);
        setError(cause instanceof Error ? cause.message : 'Playback failed.');
      }
    },
    [stopNode],
  );

  const pause = useCallback(() => {
    if (!playingRef.current) {
      return;
    }
    offsetRef.current = getTime();
    generationRef.current += 1;
    stopNode();
    playingRef.current = false;
    setPlaying(false);
  }, [getTime, stopNode]);

  const play = useCallback(() => {
    const currentAudio = audioRef.current;
    if (!currentAudio) {
      return;
    }
    const position = offsetRef.current >= currentAudio.duration - 0.01 ? 0 : offsetRef.current;
    void startAt(position);
  }, [startAt]);

  const toggle = useCallback(() => {
    if (playingRef.current) {
      pause();
    } else {
      play();
    }
  }, [pause, play]);

  const seek = useCallback(
    (time: number) => {
      const currentAudio = audioRef.current;
      if (!currentAudio) {
        return;
      }
      const target = Math.max(0, Math.min(time, currentAudio.duration));
      offsetRef.current = target;
      if (playingRef.current) {
        void startAt(target);
      }
    },
    [startAt],
  );

  return {
    playing,
    duration: audio?.duration ?? 0,
    error,
    getTime,
    play,
    pause,
    toggle,
    seek,
  };
}
