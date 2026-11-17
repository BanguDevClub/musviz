import { useRef, useState } from 'react';
import { IMAGE_PRESETS } from '../lib/constants';
import type { ImagePresetId, LoadedImage } from '../types';
import { IconImage, IconReplace, IconTrash, IconUpload, PresetGlyph } from './Icons';

export function ArtworkPanel({
  image,
  preset,
  error,
  onFile,
  onRemove,
  onPreset,
}: {
  image: LoadedImage | null;
  preset: ImagePresetId;
  error: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  onPreset: (preset: ImagePresetId) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const current = IMAGE_PRESETS.find((item) => item.id === preset);

  return (
    <section className="panel" aria-labelledby="artwork-panel-title">
      <div className="panel-head">
        <div className="panel-heading">
          <span className="panel-step">03</span>
          <h2 className="panel-title" id="artwork-panel-title">
            Artwork
          </h2>
        </div>
        <span className="panel-badge">{image ? 'Loaded' : 'Optional'}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFile(file);
          }
          event.target.value = '';
        }}
      />

      {image ? (
        <div className="artwork-row">
          <div className="artwork-thumb">
            <img src={image.url} alt="Uploaded artwork preview" />
          </div>
          <div className="artwork-info">
            <span className="artwork-name" title={image.file.name}>
              {image.file.name}
            </span>
            <span className="artwork-dim">
              {image.width} × {image.height}
            </span>
          </div>
          <div className="track-actions">
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => inputRef.current?.click()}
              aria-label="Replace artwork"
              title="Replace artwork"
            >
              <IconReplace size={15} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={onRemove}
              aria-label="Remove artwork"
              title="Remove artwork"
            >
              <IconTrash size={15} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`dropzone compact${dragging ? ' is-dragging' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) {
              onFile(file);
            }
          }}
        >
          <span className="dropzone-icon">
            <IconUpload size={17} />
          </span>
          <span className="dropzone-text">
            <strong>Add artwork</strong>
            <span>PNG, JPG, WebP — used in-frame and in the backdrop</span>
          </span>
        </button>
      )}

      {error ? (
        <div className="alert track-error" role="alert">
          <IconImage size={14} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="preset-grid" role="group" aria-label="Artwork layout preset">
        {IMAGE_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="preset"
            aria-pressed={preset === item.id}
            onClick={() => onPreset(item.id)}
            title={item.description}
          >
            <span className="preset-thumb">
              <PresetGlyph id={item.id} />
            </span>
            <span className="preset-copy">
              {item.name}
              {item.id === 'frame' ? <span>default</span> : null}
            </span>
          </button>
        ))}
      </div>
      <p className="panel-hint" style={{ marginTop: 10 }}>
        {current?.description}
      </p>
    </section>
  );
}
