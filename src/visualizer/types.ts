import type { Palette } from '../types';
import type { Render2D } from './primitives';

export type Layout = {
  margin: number;
  textX: number;
  textAlign: 'left' | 'center';
  textMaxWidth: number;
  titleSize: number;
  titleLineHeight: number;
  artistSize: number;
  textTop: number;
  heightScale: number;
  titleLines: string[];
  artistText: string;
  art: { x: number; y: number; size: number; shape: 'card' | 'circle' } | null;
  stage: { x: number; y: number; radius: number };
  bar: { left: number; right: number; base: number; maxHeight: number };
  wave: { left: number; right: number; center: number };
};

export type SceneInput = {
  ctx: Render2D;
  width: number;
  height: number;
  time: number;
  palette: Palette;
  layout: Layout;
  spectrum: Float32Array;
  wave: Float32Array;
  bass: number;
  level: number;
};
