import {
  AudioSample,
  AudioSampleSource,
  BufferTarget,
  CanvasSource,
  Output,
  Quality,
  StreamTarget,
  type MetadataTags,
  type StreamTargetChunk,
} from 'mediabunny';
import { progressMessage } from '../export/protocol';
import type { ExportRequest, ExportWorkerRequest, ExportWorkerResponse } from '../export/protocol';
import { createOutputFormat, isPcmCodec } from '../lib/codecs';
import { ensureDisplayFont, VisualizerRenderer } from '../visualizer/renderer';

/**
 * Narrow worker scope: the DOM lib types `self` as Window, while this module runs as a module worker.
 * The shape below is the minimal, known surface this worker uses.
 */
const workerScope = self as unknown as {
  postMessage(message: ExportWorkerResponse, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<ExportWorkerRequest>) => void) | null;
};

class CancelledError extends Error {}

let cancelled = false;
let activeOutput: Output | null = null;
let activeWritable: FileSystemWritableFileStream | null = null;

function report(
  phase: 'preparing' | 'audio' | 'rendering' | 'finalizing',
  progress: number,
  frame = 0,
  total = 0,
): void {
  workerScope.postMessage(progressMessage(phase, progress, frame, total));
}

async function addAllAudio(
  request: ExportRequest,
  audioSource: AudioSampleSource,
  totalFrames: number,
): Promise<void> {
  const { channels, numberOfChannels, sampleRate } = request;
  const chunkFrames = Math.max(1, Math.round(sampleRate * 5));
  const chunkCount = Math.ceil(totalFrames / chunkFrames);

  for (let chunk = 0; chunk < chunkCount; chunk += 1) {
    if (cancelled) {
      throw new CancelledError();
    }
    const start = chunk * chunkFrames;
    const frames = Math.min(chunkFrames, totalFrames - start);
    if (frames <= 0) {
      break;
    }

    const data = new Float32Array(frames * numberOfChannels);
    for (let frame = 0; frame < frames; frame += 1) {
      const source = start + frame;
      for (let channel = 0; channel < numberOfChannels; channel += 1) {
        data[frame * numberOfChannels + channel] = channels[channel]?.[source] ?? 0;
      }
    }

    const sample = new AudioSample({
      data,
      format: 'f32',
      numberOfChannels,
      sampleRate,
      timestamp: start / sampleRate,
    });
    try {
      await audioSource.add(sample);
    } finally {
      sample.close();
    }

    if (chunk % Math.max(1, Math.floor(chunkCount / 20)) === 0) {
      report('audio', 0.05 + 0.06 * ((chunk + 1) / chunkCount));
    }
  }
}

async function runExport(request: ExportRequest): Promise<void> {
  const { settings, width, height, duration, channels, sampleRate } = request;
  const totalFramesAudio = channels[0]?.length ?? 0;
  const frameCount = Math.max(1, Math.ceil(duration * settings.fps));
  const frameDuration = 1 / settings.fps;

  report('preparing', 0.015);
  await ensureDisplayFont(request.fontUrl);

  let image: ImageBitmap | null = null;
  try {
    if (request.imageFile) {
      image = await createImageBitmap(request.imageFile, { imageOrientation: 'from-image' });
    }
  } catch {
    throw new Error('The artwork image could not be decoded for export.');
  }

  let bufferTarget: BufferTarget | null = null;
  let target: BufferTarget | StreamTarget;
  if (request.saveHandle) {
    activeWritable = await request.saveHandle.createWritable();
    // FileSystemWritableFileStream accepts { type, data, position } chunks at runtime; the DOM
    // and Mediabunny generic parameters simply don't line up structurally.
    const writable = activeWritable as unknown as WritableStream<StreamTargetChunk>;
    target = new StreamTarget(writable, { chunked: true, chunkSize: 8 * 1024 * 1024 });
  } else {
    bufferTarget = new BufferTarget();
    target = bufferTarget;
  }

  const output = new Output({
    format: createOutputFormat(settings.container),
    target,
  });
  activeOutput = output;

  const metadata: MetadataTags = {};
  if (request.config.title.trim()) {
    metadata.title = request.config.title.trim();
  }
  if (request.config.artist.trim()) {
    metadata.artist = request.config.artist.trim();
  }
  if (Object.keys(metadata).length > 0) {
    output.setMetadataTags(metadata);
  }

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    throw new Error('Could not create the export canvas.');
  }
  context.imageSmoothingQuality = 'high';

  const videoSource = new CanvasSource(canvas, {
    codec: settings.videoCodec,
    quality: new Quality(settings.quality),
    latencyMode: 'quality',
  });
  output.addVideoTrack(videoSource, { frameRate: settings.fps });

  const renderer = new VisualizerRenderer(width, height, request.config, image, {
    channels,
    sampleRate,
    duration,
  });

  const audioSource = new AudioSampleSource({
    codec: settings.audioCodec,
    ...(isPcmCodec(settings.audioCodec) ? {} : { quality: new Quality('high') }),
    transform: { sampleRate: 48000 },
  });
  output.addAudioTrack(audioSource);

  await output.start();

  try {
    report('audio', 0.05);
    await addAllAudio(request, audioSource, totalFramesAudio);
    audioSource.close();
    if (cancelled) {
      throw new CancelledError();
    }

    const progressStep = Math.max(1, Math.floor(frameCount / 300));
    for (let frame = 0; frame < frameCount; frame += 1) {
      if (cancelled) {
        throw new CancelledError();
      }
      const time = frame / settings.fps;
      renderer.draw(context, time);
      await videoSource.add(time, frameDuration);
      if (frame % progressStep === 0) {
        report('rendering', 0.11 + 0.86 * (frame / frameCount), frame, frameCount);
      }
    }
    videoSource.close();

    report('finalizing', 0.985, frameCount, frameCount);
    await output.finalize();

    if (bufferTarget) {
      const buffer = bufferTarget.buffer;
      if (!buffer) {
        throw new Error('The encoder produced an empty file.');
      }
      workerScope.postMessage(
        {
          type: 'done',
          name: request.fileName,
          buffer,
          size: buffer.byteLength,
          savedToDisk: false,
        },
        [buffer],
      );
    } else {
      const file = await request.saveHandle!.getFile();
      workerScope.postMessage({
        type: 'done',
        name: file.name || request.fileName,
        buffer: null,
        size: file.size,
        savedToDisk: true,
      });
    }
    activeWritable = null;
    activeOutput = null;
  } finally {
    image?.close();
  }
}

workerScope.onmessage = (event) => {
  const message = event.data;
  if (message.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (message.type !== 'start') {
    return;
  }

  void (async () => {
    try {
      await runExport(message);
    } catch (error) {
      try {
        await activeOutput?.cancel();
      } catch {
        // The output may not have reached a state that can be cancelled.
      }
      try {
        await activeWritable?.abort();
      } catch {
        // The writable is already closed after finalize/cancel.
      }
      activeWritable = null;
      activeOutput = null;

      if (error instanceof CancelledError || cancelled) {
        workerScope.postMessage({ type: 'canceled' });
      } else {
        workerScope.postMessage({
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  })();
};
