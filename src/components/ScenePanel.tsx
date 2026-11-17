import { PROFILES } from '../lib/constants';
import type { ProfileId } from '../types';
import { ProfileGlyph } from './Icons';

export function ScenePanel({
  profile,
  onChange,
}: {
  profile: ProfileId;
  onChange: (profile: ProfileId) => void;
}) {
  const current = PROFILES.find((item) => item.id === profile);

  return (
    <section className="panel" aria-labelledby="scene-panel-title">
      <div className="panel-head">
        <div className="panel-heading">
          <span className="panel-step">02</span>
          <h2 className="panel-title" id="scene-panel-title">
            Visualizer
          </h2>
        </div>
        <span className="panel-badge">{PROFILES.length} scenes</span>
      </div>

      <div className="profile-grid" role="group" aria-label="Visualizer scene">
        {PROFILES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="profile-option"
            aria-pressed={profile === item.id}
            onClick={() => onChange(item.id)}
            title={`${item.name} — ${item.description}`}
          >
            <ProfileGlyph id={item.id} />
            <span>{item.name}</span>
          </button>
        ))}
      </div>

      <p className="panel-hint" style={{ marginTop: 10 }}>
        {current?.description ?? 'Pick a motion for your track.'}
      </p>
    </section>
  );
}
