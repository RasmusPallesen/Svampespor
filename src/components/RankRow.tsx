import { band } from '../lib/weather/model';
import { BAND_COLOR } from './Dial';
import { useApp } from '../state/AppContext';
import type { RankedSpot } from '../lib/spots/ranking';

const TONE_CLASS: Record<string, string> = { good: 'good', history: 'history', bad: 'bad', neutral: '' };

/** Én rangeret række — sted, score, hvorfor, og hvad det gør i morgen. */
export function RankRow({ ranked, index, showNum }: { ranked: RankedSpot; index: number; showNum: boolean }) {
  const { setActiveSpot, goto, cycleRelation, relations } = useApp();
  const { spot, score, reading, reasons, forward } = ranked;
  const rel = relations[spot.id] ?? null;
  const b = band(score);
  const pinned = rel === 'pinned';

  const conf = forward.confidence;
  const showConf = conf !== 'sikker' && conf !== 'målt';

  const open = () => { setActiveSpot(spot.id); goto('jagt'); };

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
      </div>
    </div>
  );
}
