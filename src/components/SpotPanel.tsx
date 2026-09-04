import { useMemo } from 'react';

import { SPECIES, SPOTS } from '../data/catalog';
import { rankSpots, type Find } from '../lib/spots/ranking';
import { useApp } from '../state/AppContext';
import { RankRow } from './RankRow';

/**
 * Rangeringspanelet under Jagten. To udsnit: "I dag" (top 6 på tværs) og
 * "Mine steder" (grupperet i fastgjort/fulgt/skjult). Rangeringen kommer
 * udelukkende fra `rankSpots` — panelet vælger kun, hvad der vises.
 */
export function SpotPanel() {
  const {
    weather, targetSpecies, setTargetSpeciesName, finds, relations, today,
    segment, setSegment, showHidden, toggleHidden,
  } = useApp();

  // Ranger altid alle steder (også skjulte), så antallet af fravalgte kendes;
  // showHidden styrer kun visningen. Ellers forsvinder "Vis X fravalgte"-knappen.
  const ranked = useMemo(() => {
    const rankFinds: Find[] = finds.map((f) => ({ spotId: f.spotId, species: f.species, date: f.date }));
    return rankSpots({
      spots: SPOTS, weather, species: targetSpecies, finds: rankFinds,
      relations, today, includeHidden: true,
    });
  }, [weather, targetSpecies, finds, relations, today]);

  const hunt = (
    <div className="panel-top">
      <div className="seg">
        <button data-seg="idag" aria-pressed={segment === 'idag'} onClick={() => setSegment('idag')}>I dag</button>
        <button data-seg="mine" aria-pressed={segment === 'mine'} onClick={() => setSegment('mine')}>Mine steder</button>
      </div>
      <div className="hunt">
        <label htmlFor="tArt">Jager</label>
        <select id="tArt" value={targetSpecies.nameDa} onChange={(e) => setTargetSpeciesName(e.target.value)}>
          {SPECIES.map((s) => <option key={s.nameDa} value={s.nameDa}>{s.nameDa}</option>)}
        </select>
      </div>
    </div>
  );

  if (segment === 'idag') {
    const top = ranked.filter((r) => r.relation !== 'hidden').slice(0, 6);
    return (
      <div className="panel">
        {hunt}
        <div className="panel-label">
          <span>Bedst i dag — {targetSpecies.nameDa}</span>
          <span>{targetSpecies.window[0]}-{targetSpecies.window[1]} d</span>
        </div>
        {top.map((r, i) => <RankRow key={r.spot.id} ranked={r} index={i} showNum />)}
        <button className="link-btn" onClick={() => setSegment('mine')}>Se kun mine steder →</button>
      </div>
    );
  }

  const pin = ranked.filter((r) => r.relation === 'pinned');
  const fol = ranked.filter((r) => r.relation === 'followed');
  const hid = ranked.filter((r) => r.relation === 'hidden');

  return (
    <div className="panel">
      {hunt}
      {pin.length > 0 && <>
        <div className="grp-label">Fastgjort — {pin.length}/5</div>
        {pin.map((r, i) => <RankRow key={r.spot.id} ranked={r} index={i} showNum={false} />)}
      </>}
      {fol.length > 0 && <>
        <div className="grp-label">Fulgt</div>
        {fol.map((r, i) => <RankRow key={r.spot.id} ranked={r} index={i} showNum={false} />)}
      </>}
      {pin.length === 0 && fol.length === 0 && (
        <div className="empty">Ingen steder endnu. Fastgør dem, du vender tilbage til.</div>
      )}
      {hid.length > 0 && showHidden && <>
        <div className="grp-label">Skjult</div>
        {hid.map((r, i) => <RankRow key={r.spot.id} ranked={r} index={i} showNum={false} />)}
      </>}
      {hid.length > 0 && (
        <button className="link-btn" onClick={toggleHidden}>
          {showHidden ? 'Skjul de fravalgte' : `Vis ${hid.length} fravalgte`}
        </button>
      )}
    </div>
  );
}
