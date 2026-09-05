import { useState } from 'react';

import { band } from '../lib/weather/model';
import { BAND_COLOR } from './Dial';
import { useApp } from '../state/AppContext';
import type { RankedSpot } from '../lib/spots/ranking';

const TONE_CLASS: Record<string, string> = { good: 'good', history: 'history', bad: 'bad', neutral: '' };

/** Én rangeret række — sted, score, hvorfor, og hvad det gør i morgen. */
export function RankRow({ ranked, index, showNum }: { ranked: RankedSpot; index: number; showNum: boolean }) {
  const { setActiveSpot, goto, cycleRelation, relations, updateUserSpot, deleteUserSpot, showToast } = useApp();
  const { spot, score, reading, reasons, forward } = ranked;
  const rel = relations[spot.id] ?? null;
  const b = band(score);
  const pinned = rel === 'pinned';

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(spot.name);
  const [editRegion, setEditRegion] = useState(spot.region);
  const [busy, setBusy] = useState(false);

  const conf = forward.confidence;
  const showConf = conf !== 'sikker' && conf !== 'målt';

  const open = () => { setActiveSpot(spot.id); goto('jagt'); };

  const startEdit = () => { setEditName(spot.name); setEditRegion(spot.region); setEditing(true); };

  const saveEdit = async () => {
    const trimmed = editName.trim();
    if (!trimmed) { showToast('Giv stedet et navn'); return; }
    setBusy(true);
    try {
      await updateUserSpot(spot.id, { name: trimmed, region: editRegion.trim() });
      setEditing(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Kunne ikke gemme ændringen');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Slet "${spot.name}"? Det kan ikke fortrydes.`)) return;
    setBusy(true);
    try {
      await deleteUserSpot(spot.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Kunne ikke slette stedet');
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="rank">
        {showNum && <div className={`rank-n${index === 0 ? ' top' : ''}`}>{index + 1}</div>}
        <div className="rank-edit">
          <div className="field">
            <label htmlFor={`re-name-${spot.id}`}>Navn</label>
            <input id={`re-name-${spot.id}`} type="text" value={editName}
              onChange={(e) => setEditName(e.target.value)} autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); }} />
          </div>
          <div className="field">
            <label htmlFor={`re-region-${spot.id}`}>Egn</label>
            <input id={`re-region-${spot.id}`} type="text" value={editRegion}
              onChange={(e) => setEditRegion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); }} />
          </div>
          <div className="find-foot">
            <button className="btn" style={{ flex: 2 }} onClick={saveEdit} disabled={busy}>Gem</button>
            <button className="share-btn" onClick={() => setEditing(false)} disabled={busy}>Annullér</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rank">
      {showNum && <div className={`rank-n${index === 0 ? ' top' : ''}`}>{index + 1}</div>}
      <div
        className="rank-body"
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => { if (e.key === 'Enter') open(); }}
      >
        <div className="rank-title">
          <b>{spot.name}</b>
          <span className="sc" style={{ color: BAND_COLOR[b.key] }}>{score}</span>
        </div>
        <div className="rank-sub">{spot.region} · {reading.rain14.toFixed(0)} mm / 14 d</div>
        <div className="whys">
          {reasons.map((w, i) => (
            <span key={i} className={`why ${TONE_CLASS[w.tone]}`}>{w.text}</span>
          ))}
        </div>
        <div className={`rank-fw ${forward.tone}`}>
          {forward.text}
          {showConf && <span className={`conf${conf === 'løs prognose' ? ' loose' : ''}`}>{conf}</span>}
        </div>
      </div>
      <div className="rank-acts">
        <button
          className={`pinbtn${pinned ? ' on' : ''}`}
          onClick={() => cycleRelation(spot.id, 'pinned')}
          title={pinned ? 'Frigør' : 'Fastgør øverst'}
          aria-label={`Fastgør ${spot.name}`}
        >
          {pinned ? '★' : '☆'}
        </button>
        <button
          className={`pinbtn hide${rel === 'hidden' ? ' on' : ''}`}
          onClick={() => cycleRelation(spot.id, 'hidden')}
          title="Skjul stedet"
          aria-label={`Skjul ${spot.name}`}
        >
          −
        </button>
        {spot.isUserSpot && (
          <>
            <button className="pinbtn" onClick={startEdit} disabled={busy} title="Redigér" aria-label={`Redigér ${spot.name}`}>
              ✎
            </button>
            <button className="pinbtn hide" onClick={remove} disabled={busy} title="Slet" aria-label={`Slet ${spot.name}`}>
              🗑
            </button>
          </>
        )}
      </div>
    </div>
  );
}
