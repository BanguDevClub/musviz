export function LabelsPanel({
  title,
  artist,
  onTitle,
  onArtist,
}: {
  title: string;
  artist: string;
  onTitle: (value: string) => void;
  onArtist: (value: string) => void;
}) {
  return (
    <section className="panel" aria-labelledby="labels-panel-title">
      <div className="panel-head">
        <div className="panel-heading">
          <span className="panel-step">05</span>
          <h2 className="panel-title" id="labels-panel-title">
            Labels
          </h2>
        </div>
        <span className="panel-badge">Baked into export</span>
      </div>

      <div className="field-grid">
        <div className="field">
          <label className="field-label" htmlFor="track-title">
            Title
            <span className="field-hint">{title.length}/80</span>
          </label>
          <input
            id="track-title"
            className="input"
            type="text"
            value={title}
            maxLength={80}
            placeholder="Midnight Drive"
            autoComplete="off"
            onChange={(event) => onTitle(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="track-artist">
            Artist
            <span className="field-hint">{artist.length}/60</span>
          </label>
          <input
            id="track-artist"
            className="input"
            type="text"
            value={artist}
            maxLength={60}
            placeholder="Nova"
            autoComplete="off"
            onChange={(event) => onArtist(event.target.value)}
          />
        </div>
      </div>
      <p className="panel-hint" style={{ marginTop: 10 }}>
        Tags from your audio file are used when the fields are empty.
      </p>
    </section>
  );
}
