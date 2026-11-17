import { ALL_FORMATS, AudioBufferSink, BlobSource, Input, type MetadataTags } from 'mediabunny';
import type { DecodedAudio } from '../types';
import { MAX_TRACK_SECONDS } from './constants';

export type AudioDecodeProgress = {
  /** 0..1 */
  progress: number;
  seconds: number;
};

const MAX_MASTER_CHANNELS = 2;

function computePeaks(channels: Float32Array[], buckets = 128): Float32Array {
  const peaks = new Float32Array(buckets);
  const length = channels[0]?.length ?? 0;
  if (length === 0 || channels.length === 0) {
    return peaks;
  }

  const channelCount = channels.length;
  const totalPerBucket = length / buckets;
  let globalMax = 0;

  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const start = Math.floor(bucket * totalPerBucket);
    const end = Math.min(length, Math.floor((bucket + 1) * totalPerBucket));
    const stride = Math.max(1, Math.floor((end - start) / 2048));
    let peak = 0;
    for (let index = start; index < end; index += stride) {
      let sample = 0;
      for (let channel = 0; channel < channelCount; channel += 1) {
        sample += channels[channel]![index]!;
      }
      peak = Math.max(peak, Math.abs(sample / channelCount));
    }
    peaks[bucket] = peak;
    globalMax = Math.max(globalMax, peak);
  }

  if (globalMax > 1e-6) {
    for (let bucket = 0; bucket < buckets; bucket += 1) {
      peaks[bucket] = Math.pow(peaks[bucket]! / globalMax, 0.72);
    }
  }

  return peaks;
}

/**
 * Decodes the primary audio track into planar float PCM using Mediabunny's sink.
 * Audio on the web is decoded through WebCodecs, so this stays fast and fully local.
 */
export async function decodeAudioFile(
  file: File,
  onProgress?: (progress: AudioDecodeProgress) => void,
): Promise<DecodedAudio> {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });

  try {
    const canRead = await input.canRead();
    if (!canRead) {
      throw new Error('That file does not look like a media file MusViz can read.');
    }

    const track = await input.getPrimaryAudioTrack();
    if (!track) {
      throw new Error('No audio track found in this file. Try a WAV, MP3, FLAC, AAC, OGG, or MP4.');
    }

    const decodable = await track.canDecode();
    if (!decodable) {
      throw new Error('This audio codec is not decodable by your browser.');
    }

    const totalDuration = await track.computeDuration();
    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
      throw new Error('This track appears to be empty.');
    }
    if (totalDuration > MAX_TRACK_SECONDS) {
      throw new Error('MusViz supports tracks up to 15 minutes long.');
    }

    const [sampleRate, trackChannels, codec, trackStart, tags] = await Promise.all([
      track.getSampleRate(),
      track.getNumberOfChannels(),
      track.getCodec(),
      track.getFirstTimestamp(),
      input.getMetadataTags().catch((): MetadataTags => ({})),
    ]);

    if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
      throw new Error('Invalid sample rate in this file.');
    }

    const numberOfChannels = Math.max(1, Math.min(MAX_MASTER_CHANNELS, trackChannels));
    const start = Number.isFinite(trackStart) ? Math.max(0, trackStart) : 0;
    const span = Math.max(0.1, totalDuration - start);
    const initialCapacity = Math.ceil((span + 1) * sampleRate);
    let capacity = initialCapacity;
    let channels = Array.from(
      { length: numberOfChannels },
      () => new Float32Array(initialCapacity),
    );
    let maxEnd = 0;
    let decodedSeconds = 0;
    let lastReport = 0;
    let expectedFrame = 0;

    const sink = new AudioBufferSink(track);
    for await (const wrapped of sink.buffers(start)) {
      const { buffer, timestamp } = wrapped;
      if (buffer.sampleRate !== sampleRate) {
        throw new Error(
          `Unexpected sample rate change (${sampleRate} Hz → ${buffer.sampleRate} Hz).`,
        );
      }

      const offset = Math.max(0, Math.round((timestamp - start) * sampleRate));
      if (offset < 0) {
        continue;
      }
      // Keep packets sample-accurate and contiguous even when timestamps round awkwardly.
      const frameOffset = Math.abs(offset - expectedFrame) <= 2 ? expectedFrame : offset;
      const frames = buffer.length;
      const required = frameOffset + frames;

      if (required > capacity) {
        capacity = Math.max(required, Math.ceil(required * 1.5));
        channels = channels.map((channel) => {
          const grown = new Float32Array(capacity);
          grown.set(channel);
          return grown;
        });
      }

      for (let channel = 0; channel < numberOfChannels; channel += 1) {
        const sourceChannel = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
        channels[channel]!.set(sourceChannel, frameOffset);
      }

      expectedFrame = required;
      maxEnd = Math.max(maxEnd, required);
      decodedSeconds = Math.min(span, timestamp + buffer.duration - start);

      const now = performance.now();
      if (now - lastReport > 90) {
        lastReport = now;
        onProgress?.({
          progress: Math.min(1, decodedSeconds / span),
          seconds: decodedSeconds,
        });
      }
    }

    if (maxEnd === 0) {
      throw new Error('No decodable audio samples were found in this file.');
    }

    const finalChannels = channels.map((channel) => channel.subarray(0, maxEnd));
    const duration = maxEnd / sampleRate;
    const peaks = computePeaks(finalChannels);

    onProgress?.({ progress: 1, seconds: duration });

    return {
      file,
      name: file.name,
      size: file.size,
      duration,
      sampleRate,
      numberOfChannels,
      channels: finalChannels,
      peaks,
      codec: codec ?? null,
      tags: {
        title: typeof tags.title === 'string' ? tags.title.trim() || null : null,
        artist: typeof tags.artist === 'string' ? tags.artist.trim() || null : null,
      },
    };
  } finally {
    input.dispose();
  }
}

/** Builds an AudioBuffer for preview playback without disturbing the source PCM. */
export function createPlaybackBuffer(context: BaseAudioContext, audio: DecodedAudio): AudioBuffer {
  const buffer = context.createBuffer(
    audio.numberOfChannels,
    audio.channels[0]?.length ?? 0,
    audio.sampleRate,
  );
  for (let channel = 0; channel < audio.numberOfChannels; channel += 1) {
    buffer.getChannelData(channel).set(audio.channels[channel]!);
  }
  return buffer;
}
