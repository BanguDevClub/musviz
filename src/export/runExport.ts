import type {
  DecodedAudio,
  ExportProgress,
  ExportResult,
  ExportSettings,
  LoadedImage,
  RenderConfig,
} from '../types';
import type { ExportRequest, ExportWorkerResponse } from './protocol';
import { CONTAINERS, RESOLUTIONS } from '../lib/constants';
import { createOutputFormat } from '../lib/codecs';
import { buildFileName } from '../lib/format';
import { DISPLAY_FONT_URL } from '../lib/font';

export class ExportCancelledError extends Error {
  constructor() {
    super('Export cancelled.');
    this.name = 'ExportCancelledError';
  }
}

export type ExportTask = {
  promise: Promise<ExportResult>;
  cancel: () => void;
};

type SaveFilePicker = (options: {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandle>;

function getSaveFilePicker(): SaveFilePicker | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const candidate = Reflect.get(window, 'showSaveFilePicker');
  // Feature-detect the File System Access picker; TypeScript's DOM lib doesn't ship this entry point.
  return typeof candidate === 'function' ? (candidate as SaveFilePicker) : null;
}

export async function startExport(options: {
  audio: DecodedAudio;
  image: LoadedImage | null;
  config: RenderConfig;
  settings: ExportSettings;
  onProgress: (progress: ExportProgress) => void;
}): Promise<ExportTask> {
  const { audio, image, config, settings, onProgress } = options;
  const resolution = RESOLUTIONS.find((item) => item.id === settings.height) ?? RESOLUTIONS[1]!;
  const container = CONTAINERS.find((item) => item.id === settings.container) ?? CONTAINERS[0]!;
  const format = createOutputFormat(settings.container);
  const fileName = buildFileName(
    config.title,
    resolution.height,
    settings.fps,
    container.extension,
  );
  const mime = format.mimeType;

  let saveHandle: FileSystemFileHandle | null = null;
  const picker = settings.saveMode === 'picker' ? getSaveFilePicker() : null;
  if (picker) {
    try {
      saveHandle = await picker({
        suggestedName: fileName,
        types: [
          {
            description: `${container.name} video`,
            accept: { [mime]: [`.${container.extension}`] },
          },
        ],
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'AbortError') {
        throw new ExportCancelledError();
      }
      // Sandboxed iframes and unsupported picker states fall back to an in-memory render followed
      // by a regular browser download.
      saveHandle = null;
    }
  }

  const channels = audio.channels.map((channel) => channel.slice());
  const request: ExportRequest = {
    type: 'start',
    settings,
    width: resolution.width,
    height: resolution.height,
    duration: audio.duration,
    sampleRate: audio.sampleRate,
    numberOfChannels: audio.numberOfChannels,
    channels,
    imageFile: image?.file ?? null,
    config,
    fontUrl: DISPLAY_FONT_URL,
    fileName,
    saveHandle,
  };

  const worker = new Worker(new URL('../workers/export.worker.ts', import.meta.url), {
    type: 'module',
    name: 'musviz-export',
  });

  const { promise, resolve, reject } = Promise.withResolvers<ExportResult>();
  let settled = false;
  let cancelRequested = false;
  let cancelTimer: ReturnType<typeof setTimeout> | undefined;

  const finish = (callback: () => void) => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(cancelTimer);
    worker.terminate();
    callback();
  };

  const cancel = () => {
    if (settled || cancelRequested) {
      return;
    }
    cancelRequested = true;
    worker.postMessage({ type: 'cancel' });
    cancelTimer = setTimeout(() => {
      finish(() => reject(new ExportCancelledError()));
    }, 2000);
  };

  worker.onmessage = (event: MessageEvent<ExportWorkerResponse>) => {
    const message = event.data;
    if (message.type === 'progress') {
      if (!cancelRequested) {
        onProgress({
          phase: message.phase,
          progress: message.progress,
          frame: message.frame,
          totalFrames: message.totalFrames,
        });
      }
      return;
    }
    if (message.type === 'canceled') {
      finish(() => reject(new ExportCancelledError()));
      return;
    }
    if (message.type === 'error') {
      finish(() => {
        reject(cancelRequested ? new ExportCancelledError() : new Error(message.message));
      });
      return;
    }
    if (message.type === 'done') {
      if (cancelRequested) {
        finish(() => reject(new ExportCancelledError()));
        return;
      }
      const url = message.buffer
        ? URL.createObjectURL(new Blob([message.buffer], { type: mime }))
        : null;
      finish(() =>
        resolve({
          name: message.name,
          size: message.size,
          url,
          savedToDisk: message.savedToDisk,
        }),
      );
    }
  };

  worker.onerror = (event) => {
    finish(() => reject(new Error(event.message || 'The export worker failed to start.')));
  };

  worker.onmessageerror = () => {
    finish(() => reject(new Error('The export worker sent an unreadable message.')));
  };

  worker.postMessage(
    request,
    channels.map((channel) => channel.buffer),
  );

  return { promise, cancel };
}
