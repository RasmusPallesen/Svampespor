import { useRef, useState } from 'react';

import { HABITATS, SHOT_SLOTS, SPECIES, findSpecies, findSpot } from '../data/catalog';
import { identify } from '../lib/id/identify';
import { shrink } from '../lib/id/shrink';
import type { Candidate, IdResult, Shot } from '../lib/id/types';
import { read } from '../lib/weather/model';
import { useApp } from '../state/AppContext';
import { useCaptureLocation } from '../state/useCaptureLocation';

type Result =
  | { kind: 'idle' }
  | { kind: 'analysing' }
  | { kind: 'done'; data: IdResult }
  | { kind: 'error'; message: string };

const SEV_LABEL: Record<string, string> = { doedelig: 'dødelig', giftig: 'giftig', uspiselig: 'uspiselig' };
const sevClass = (s: string) => (s === 'doedelig' ? 'dodelig' : s === 'giftig' ? 'giftig' : 'uspiselig');

export function BestemView() {
  const { weather, activeSpotId, addFind, ensureSpecies, today, goto, showToast } = useApp();
  const captureLocation = useCaptureLocation();
  const [shots, setShots] = useState<(Shot | null)[]>([null, null, null]);
  const [habitat, setHabitat] = useState(HABITATS[0]);
  const [obs, setObs] = useState('');
  const [result, setResult] = useState<Result>({ kind: 'idle' });

  const fileRef = useRef<HTMLInputElement>(null);
  const pickSlot = useRef(0);

  const openPicker = (i: number) => { pickSlot.current = i; fileRef.current?.click(); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const shot = await shrink(f);
      setShots((prev) => prev.map((s, i) => (i === pickSlot.current ? shot : s)));
    } catch {
      setResult({ kind: 'error', message: 'Billedet kunne ikke læses. Prøv et andet format — JPEG eller PNG.' });
    }
  };

  const clear = (i: number) => setShots((prev) => prev.map((s, j) => (j === i ? null : s)));

  const run = async () => {
    const chosen = shots.map((s, i) => ({ s, i })).filter((o) => o.s);
    if (!chosen.length) {
      setResult({ kind: 'error', message: 'Tilføj mindst ét billede. Undersiden og stokbasen bærer de fleste af kendetegnene.' });
      return;
    }
    setResult({ kind: 'analysing' });
    try {
      const data = await identify({
        images: chosen.map((o) => (o.s as Shot).b64),
        habitat,
        observations: obs,
        order: chosen.map((o) => SHOT_SLOTS[o.i].cap),
      });
      setResult({ kind: 'done', data });
    } catch (err) {
      setResult({ kind: 'error', message: err instanceof Error ? err.message : 'Der er ikke forbindelse til bestemmelsesmotoren lige nu.' });
    }
  };

  const saveCandidate = async (c: Candidate) => {
    const spot = findSpot(activeSpotId);
    const w = weather[activeSpotId];
    if (!spot || !w) { showToast('Vejret er ikke hentet endnu'); return; }
    const r = read(w, SPECIES[0]); // snapshot-felterne er artsuafhængige
    const geo = await captureLocation();
    try {
      await addFind({
        species: c.name_da,
        speciesLat: c.name_lat,
        habitat,
        quantity: '1',
        spotId: spot.id,
        spotName: spot.name,
        note: obs.trim(),
        date: today.toISOString().slice(0, 10),
        snapshot: { rain14: Math.round(r.rain14), daysSince: r.daysSince ?? 0, rh: Math.round(r.rh3), tmax: Math.round(r.tmax5) },
        photos: shots.filter((s): s is Shot => Boolean(s)).map((s) => s.url),
        source: 'ai',
        confidence: c.confidence,
        geo,
      });
      // Er arten ikke allerede en hånd-verificeret kerneart, gemmes Claudes
      // egne forslag til modningsvindue og forvekslinger som en Tier
      // 2-fællesskabsart — se docs/roadmap.md. Sker først EFTER et vellykket
      // addFind, så det aldrig kan blokere selve fundet, og kun når
      // brugeren rent faktisk er logget ind (samme betingelse addFind lige
      // har bevist er opfyldt).
      if (!findSpecies(c.name_da) && result.kind === 'done') {
        void ensureSpecies({
          nameDa: c.name_da, nameLat: c.name_lat,
          window: c.ripening_window, rainMm: c.rain_mm,
          lookalikes: result.data.lookalikes,
        });
      }
      setShots([null, null, null]);
      setObs('');
      setResult({ kind: 'idle' });
      goto('log');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Kunne ikke gemme fundet');
    }
  };

  const filled = shots.filter(Boolean).length;

  return (
    <>
      <div className="creed">
        <div className="k">Læs dette først</div>
        <p>
          Svampespor giver <b>forslag, aldrig facit</b>, og udtaler sig ikke om spiselighed. En bestemmelse på et foto kan
          ikke erstatte svampen i hånden — lugt, konsistens, sporeaftryk og stokbasen findes ikke i et billede.{' '}
          <b>Spis aldrig en svamp på baggrund af en app.</b>
        </p>
      </div>

      <div className="panel">
        <div className="panel-label"><span>Tre billeder</span><span>{filled} / 3</span></div>
        <p className="shot-hint">
          Bestemmelsen bliver kun så god som dine billeder. Fotografér <b>hatten ovenfra</b>, <b>undersiden</b> med lameller
          eller rør, og <b>hele stokken med basen gravet fri</b> — det er ved foden, de dødelige fluesvampe afslører deres pose.
        </p>

        <div className="shots">
          {SHOT_SLOTS.map((slot, i) => {
            const shot = shots[i];
            return shot ? (
              <div className="shot filled" key={slot.k}>
                <img src={shot.url} alt={slot.cap} />
                <button className="x" aria-label="Fjern billede" onClick={() => clear(i)}>×</button>
                <span className="req">{slot.k}</span>
              </div>
            ) : (
              <div className="shot" key={slot.k} role="button" tabIndex={0}
                onClick={() => openPicker(i)}
                onKeyDown={(e) => { if (e.key === 'Enter') openPicker(i); }}>
                <span className="glyph">+</span>
                <span className="cap">{slot.cap}</span>
                <span className="req">{slot.req}</span>
              </div>
            );
          })}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />

        <div className="field">
          <label htmlFor="bHab">Voksested</label>
          <select id="bHab" value={habitat} onChange={(e) => setHabitat(e.target.value)}>
            {HABITATS.map((h) => <option key={h}>{h}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bObs">Hvad mærker du? (lugt, konsistens, farveskift ved snit)</label>
          <textarea id="bObs" placeholder="Svag abrikoslugt. Fast kød. Blånede ikke ved snit." value={obs}
            onChange={(e) => setObs(e.target.value)} />
        </div>
        <button className="btn" onClick={run} disabled={result.kind === 'analysing'}>Bestem art</button>
      </div>

      <IdResultPanel result={result} onPick={saveCandidate} />
    </>
  );
}

/* ------------------------------------------------------------------ */

function IdResultPanel({ result, onPick }: { result: Result; onPick: (c: Candidate) => void }) {
  if (result.kind === 'idle') return null;

  if (result.kind === 'analysing') {
    return (
      <div className="panel">
        <div className="analysing"><div className="spore" /><p>Læser hat, lameller og stok…</p></div>
      </div>
    );
  }

  if (result.kind === 'error') {
    return (
      <div className="panel">
        <div className="warn">
          <span className="ic">!</span>
          <div><b>Bestemmelsen kunne ikke gennemføres</b><br />{result.message}</div>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--mute)', lineHeight: 1.5, marginTop: 4 }}>
          Du kan stadig logge fundet manuelt under <b style={{ color: 'var(--lichen)' }}>Mine fund</b> og bestemme det
          senere med bog og sporeaftryk.
        </p>
      </div>
    );
  }

  const r = result.data;
  const qcol = r.quality === 'god' ? 'var(--lichen)' : r.quality === 'brugbar' ? 'var(--gold)' : 'var(--toxic)';
  const qtxt = r.quality === 'god' ? 'Godt billedmateriale' : r.quality === 'brugbar' ? 'Brugbart, men mangelfuldt' : 'Utilstrækkeligt';

  if (!r.candidates?.length) {
    return (
      <div className="panel">
        <div className="qbar"><i style={{ background: qcol }} />{qtxt}</div>
        <div className="empty">{r.quality_note || 'Der er ikke nok i billederne til at pege på en art.'}</div>
        {r.missing_evidence?.length > 0 && (
          <ul className="missing">{r.missing_evidence.map((m, i) => <li key={i}>{m}</li>)}</ul>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="panel">
        <div className="qbar"><i style={{ background: qcol }} />{qtxt}{r.quality_note ? ` · ${r.quality_note}` : ''}</div>
        <div className="panel-label" style={{ marginBottom: 12 }}>Kandidater</div>
        {r.candidates.map((c, i) => {
          // --toxic er forbeholdt dødelige forvekslinger (CLAUDE.md) — lav
          // konfidens betyder usikker gætning, ikke fare, og skal ikke se
          // ud som en advarsel om en ellers uskyldig art.
          const col = c.confidence >= 65 ? 'var(--lichen)' : c.confidence >= 40 ? 'var(--gold)' : 'var(--mute)';
          return (
            <div className={`cand${i === 0 ? ' top' : ''}`} key={i}>
              <div className="cand-head"><b>{c.name_da}</b><span className="pct" style={{ color: col }}>{c.confidence}%</span></div>
              <div className="lat">{c.name_lat}</div>
              <div className="conf"><i style={{ width: `${c.confidence}%`, background: col }} /></div>
              <p>{c.reasoning}</p>
              <div className="feats">{(c.key_features ?? []).map((f, j) => <div className="feat" key={j}>{f}</div>)}</div>
              <button className="cand-pick" onClick={() => onPick(c)}>Gem som fund — {c.name_da}</button>
            </div>
          );
        })}
      </div>

      {r.lookalikes?.length > 0 && (
        <div className="panel">
          <div className="panel-label">Forvekslinger du skal udelukke</div>
          {r.lookalikes.map((l, i) => (
            <div className="look" key={i}>
              <span className={`look-sev sev-${sevClass(l.severity)}`}>{SEV_LABEL[l.severity] ?? l.severity}</span>
              <div className="look-body"><b>{l.name_da}</b><i>{l.name_lat}</i><p>{l.how_to_tell}</p></div>
            </div>
          ))}
        </div>
      )}

      {r.missing_evidence?.length > 0 && (
        <div className="panel">
          <div className="panel-label">Sådan kommer du videre</div>
          <ul className="missing">{r.missing_evidence.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}
    </>
  );
}
