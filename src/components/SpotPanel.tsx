import { useMemo, useState } from 'react';

import { SPECIES } from '../data/catalog';
import { getCurrentPosition } from '../lib/geo/geolocation';
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
    weather, targetSpecies, setTargetSpeciesName, finds, relations, today, allSpots,
    segment, setSegment, showHidden, toggleHidden,
  } = useApp();

  // Ranger altid alle steder (også skjulte), så antallet af fravalgte kendes;
  // showHidden styrer kun visningen. Ellers forsvinder "Vis X fravalgte"-knappen.
  const ranked = useMemo(() => {
    const rankFinds: Find[] = finds.map((f) => ({ spotId: f.spotId, species: f.species, date: f.date }));
    return rankSpots({
      spots: allSpots, weather, species: targetSpecies, finds: rankFinds,
      relations, today, includeHidden: true,
    });
  }, [weather, targetSpecies, finds, relations, today, allSpots]);

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
      <AddSpotForm />
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

/* ------------------------------------------------------------------ */

/**
 * Tilføjer et sted ud fra brugerens nuværende GPS-position — det, appen
 * ikke kan vide på forhånd (et privat skovstykke, en ven har vist én).
 * Kun synligt for den, der tilføjede det (RLS på `spots`). Sættes straks
 * til "fulgt", så det med det samme dukker op her, i stedet for at
 * forsvinde i en tom relations-tilstand.
 */
function AddSpotForm() {
  // addUserSpot gør selv stedet aktivt med det samme (AppContext) — et nyt
  // sted er per definition der, du står lige nu, ikke noget man skal lede efter.
  const { addUserSpot, cycleRelation, goto, showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setOpen(false); setName(''); setRegion(''); setBusy(false); };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) { showToast('Giv stedet et navn'); return; }
    setBusy(true);
    try {
      const { lat, lon } = await getCurrentPosition();
      const spot = await addUserSpot({ name: trimmed, region: region.trim(), lat, lon });
      cycleRelation(spot.id, 'followed');
      showToast(`${spot.name} tilføjet`);
      reset();
      goto('jagt');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Kunne ikke tilføje stedet');
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button className="btn ghost" style={{ marginBottom: 14 }} onClick={() => setOpen(true)}>
        + Tilføj mit eget sted her
      </button>
    );
  }

  return (
    <div className="add-spot">
      <p className="add-spot-hint">
        Gemmer din nuværende position som et nyt sted — kun synligt for dig, aldrig for andre.
      </p>
      <div className="field">
        <label htmlFor="asName">Navn</label>
        <input
          type="text" id="asName" autoFocus placeholder="Fx Onkel Henriks skovstykke"
          value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        />
      </div>
      <div className="field">
        <label htmlFor="asRegion">Egn (valgfrit)</label>
        <input
          type="text" id="asRegion" placeholder="Fx Nordsjælland"
          value={region} onChange={(e) => setRegion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        />
      </div>
      <div className="find-foot">
        <button className="btn" style={{ flex: 2 }} onClick={save} disabled={busy}>
          {busy ? 'Finder din position…' : 'Brug min position og gem'}
        </button>
        <button className="share-btn" onClick={reset} disabled={busy}>Annullér</button>
      </div>
    </div>
  );
}
