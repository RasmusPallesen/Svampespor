import { useMemo, useState } from 'react';

import { HABITATS, SPECIES, findSpot } from '../data/catalog';
import { fmtLongDate } from '../lib/format';
import { read } from '../lib/weather/model';
import { useApp } from '../state/AppContext';
import type { FindRecord } from '../lib/data/types';

export function LogView() {
  const { finds } = useApp();
  return (
    <>
      <InsightBox />
      <LogForm />
      <div className="panel">
        <div className="panel-label"><span>Feltdagbog</span><span>{finds.length} fund</span></div>
        {finds.length === 0
          ? <div className="empty">Ingen fund endnu. Første tur starter her.</div>
          : finds.map((f) => <FindCard key={f.id} find={f} />)}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function LogForm() {
  const { weather, activeSpotId, addFind, today, showToast } = useApp();
  const [speciesName, setSpeciesName] = useState(SPECIES[0].nameDa);
  const [habitat, setHabitat] = useState(HABITATS[0]);
  const [quantity, setQuantity] = useState('6');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const species = SPECIES.find((s) => s.nameDa === speciesName) ?? SPECIES[0];
  const high = species.risk === 'high';

  const save = async () => {
    const spot = findSpot(activeSpotId);
    const w = weather[activeSpotId];
    if (!spot || !w) { showToast('Vejret er ikke hentet endnu'); return; }
    const r = read(w, species);
    try {
      await addFind({
        species: species.nameDa,
        speciesLat: species.nameLat,
        habitat,
        quantity: quantity || '1',
        spotId: spot.id,
        spotName: spot.name,
        note: note.trim(),
        date: today.toISOString().slice(0, 10),
        snapshot: {
          rain14: Math.round(r.rain14),
          daysSince: r.daysSince ?? 0,
          rh: Math.round(r.rh3),
          tmax: Math.round(r.tmax5),
        },
        source: 'user',
      });
      setNote('');
      setQuantity('6');
      setSaved(true);
      setTimeout(() => setSaved(false), 1900);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Kunne ikke gemme fundet');
    }
  };

  return (
    <div className="panel">
      <div className="panel-label">Log et fund</div>
      <div className="field">
        <label htmlFor="fArt">Art</label>
        <select id="fArt" value={speciesName} onChange={(e) => setSpeciesName(e.target.value)}>
          {SPECIES.map((s) => <option key={s.nameDa} value={s.nameDa}>{s.nameDa}</option>)}
        </select>
      </div>
      <div className={`warn${high ? '' : ' safe'}`}>
        <span className="ic">{high ? '!' : 'i'}</span>
        <div><b>{species.nameLat}</b><br /><span dangerouslySetInnerHTML={{ __html: species.warn }} /></div>
      </div>
      <div className="field field-row">
        <div>
          <label htmlFor="fHab">Habitat</label>
          <select id="fHab" value={habitat} onChange={(e) => setHabitat(e.target.value)}>
            {HABITATS.map((h) => <option key={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="fAnt">Antal</label>
          <input type="text" id="fAnt" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="fNote">Feltnote</label>
        <textarea id="fNote" placeholder="Lugt, lameller, substrat, hvordan lyset faldt…" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className="btn" onClick={save} style={saved ? { background: 'var(--gold)' } : undefined}>
        {saved ? 'Gemt — vejret fulgte med' : 'Gem fund med vejrsnapshot'}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function InsightBox() {
  const { finds } = useApp();
  const insight = useMemo(() => {
    const all = finds.filter((f) => f.snapshot);
    if (all.length < 2) return null;
    const days = all.map((f) => f.snapshot.daysSince);
    const lo = Math.min(...days);
    const hi = Math.max(...days);
    const mm = Math.round(all.reduce((a, f) => a + f.snapshot.rain14, 0) / all.length);
    const rh = Math.round(all.reduce((a, f) => a + f.snapshot.rh, 0) / all.length);
    const kant = all.filter((f) => f.species === 'Kantarel');
    return { count: all.length, lo, hi, mm, rh, kant: kant[0] };
  }, [finds]);

  if (!insight) {
    return (
      <div className="insight">
        <div className="k">Dit mønster</div>
        <p>Log <b>3 fund</b>, så begynder Svampespor at læse dine egne tal frem for gennemsnittet.</p>
      </div>
    );
  }

  return (
    <div className="insight">
      <div className="k">Dit mønster</div>
      <p>
        Dine fund falder konsekvent <b>{insight.lo}-{insight.hi} dage</b> efter regn, ved omkring <b>{insight.mm} mm</b> over
        fjorten dage og <b>{insight.rh}% luftfugtighed</b>.
        {insight.kant && ` Kantarellerne kommer i den tidlige ende af vinduet — du var på plads dag ${insight.kant.snapshot.daysSince}.`}
      </p>
      <small>Bygget på {insight.count} fund. Modellen skærpes for hver tur.</small>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FindCard({ find: f }: { find: FindRecord }) {
  const { profile, openShare } = useApp();
  return (
    <div className="find">
      <div className="find-top">
        <b>
          {f.species}
          {f.source === 'ai'
            ? <span className="src-tag ai">AI-forslag {f.confidence}%</span>
            : <span className="src-tag">egen bestemmelse</span>}
        </b>
        <time>{fmtLongDate(f.date)}</time>
      </div>
      {f.photos && f.photos.length > 0 && (
        <div className="find-shots">
          {f.photos.map((p, i) => <img key={i} src={p} alt={`Foto af ${f.species}`} />)}
        </div>
      )}
      <div className="find-meta">{f.quantity} stk · {f.habitat} · {f.spotName}</div>
      {f.note && <div className="find-note">"{f.note}"</div>}
      <div className="snap">
        <div><b>{f.snapshot.rain14} mm</b><span>14 d før</span></div>
        <div><b>{f.snapshot.daysSince} d</b><span>siden regn</span></div>
        <div><b>{f.snapshot.rh}%</b><span>luftfugt</span></div>
        <div><b>{f.snapshot.tmax}°</b><span>temp</span></div>
      </div>
      <div className="find-foot">
        <button className="share-btn" onClick={() => openShare(f)}>
          {profile ? 'Del fundet' : 'Del — kræver profil'}
        </button>
      </div>
    </div>
  );
}
