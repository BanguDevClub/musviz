import type { ExportProgress, ExportSettings, RenderConfig, ExportPhase } from '../types';

export type ExportRequest = {
  type: 'start';
  settings: ExportSettings;
  width: number;
  height: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  channels: Float32Array[];
  imageFile: File | null;
  config: RenderConfig;
  fontUrl: string;
  fileName: string;
  saveHandle: FileSystemFileHandle | null;
};

export type CancelRequest = {
  type: 'cancel';
};

export type ExportWorkerRequest = ExportRequest | CancelRequest;

export type ExportWorkerResponse =
  | ({ type: 'progress' } & ExportProgress)
  | {
      type: 'done';
      name: string;
      buffer: ArrayBuffer | null;
      size: number | null;
      savedToDisk: boolean;
    }
  | { type: 'error'; message: string }
  | { type: 'canceled' };

export function progressMessage(
  phase: ExportPhase,
  progress: number,
  frame = 0,
  totalFrames = 0,
): ExportWorkerResponse {
  return { type: 'progress', phase, progress, frame, totalFrames };
}
