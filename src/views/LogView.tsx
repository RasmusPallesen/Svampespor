import { useMemo, useRef, useState } from 'react';

import { HABITATS, SOIL_TYPES, findSpot, suggestHabitat, suggestSoil } from '../data/catalog';
import { SpeciesPicker } from '../components/SpeciesPicker';
import { fmtLongDate } from '../lib/format';
import { shrink } from '../lib/id/shrink';
import { read } from '../lib/weather/model';
import { useApp } from '../state/AppContext';
import { useCaptureLocation } from '../state/useCaptureLocation';
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
  const { weather, activeSpotId, addFind, allSpecies, today, showToast, logLocation, setLogLocation } = useApp();
  const captureLocation = useCaptureLocation();
  const [speciesName, setSpeciesName] = useState(allSpecies[0].nameDa);
  // Forudfyldt ud fra det aktive steds kendte jordbund/træer (docs/spots.md)
  // i stedet for altid samme startværdi — kun et forslag, frit at rette.
  const [habitat, setHabitat] = useState(() => suggestHabitat(findSpot(activeSpotId)));
  const [soil, setSoil] = useState(() => suggestSoil(findSpot(activeSpotId)));
  const [quantity, setQuantity] = useState('6');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const species = allSpecies.find((s) => s.nameDa === speciesName) ?? allSpecies[0];
  const high = species.risk === 'high';

  const save = async () => {
    const spot = findSpot(activeSpotId);
    const w = weather[activeSpotId];
    if (!spot || !w) { showToast('Vejret er ikke hentet endnu'); return; }
    const r = read(w, species);
    const geo = await captureLocation();
    try {
      await addFind({
        species: species.nameDa,
        speciesLat: species.nameLat,
        habitat,
        soil,
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
        geo,
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
        <SpeciesPicker id="fArt" species={allSpecies} value={speciesName} onChange={setSpeciesName} />
      </div>
      <div className={`warn${high ? '' : ' safe'}`}>
        <span className="ic">{high ? '!' : 'i'}</span>
        <div><b>{species.nameLat}</b><br /><span dangerouslySetInnerHTML={{ __html: species.warn }} /></div>
      </div>
      <div className="field">
        <label htmlFor="fHab">Voksested</label>
        <select id="fHab" value={habitat} onChange={(e) => setHabitat(e.target.value)}>
          {HABITATS.map((h) => <option key={h}>{h}</option>)}
        </select>
      </div>
      <div className="field field-row">
        <div>
          <label htmlFor="fJord">Jordtype</label>
          <select id="fJord" value={soil} onChange={(e) => setSoil(e.target.value)}>
            {SOIL_TYPES.map((j) => <option key={j}>{j}</option>)}
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
      <div className="pref" style={{ marginBottom: 14 }}>
        <div>
          <b>Log nøjagtig position</b>
          <p>Din præcise placering gemmes med fundet — kun du kan se den. Kræver din tilladelse i browseren.</p>
        </div>
        <button className="switch" role="switch" aria-checked={logLocation} aria-label="Log nøjagtig position"
          onClick={() => setLogLocation(!logLocation)} />
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
  const [editing, setEditing] = useState(false);
  const hasPhotos = f.photos && f.photos.length > 0;

  if (editing) return <EditFindForm find={f} onDone={() => setEditing(false)} />;

  return (
    <div className="find">
      {hasPhotos && (
        <div className={`find-shots${f.photos!.length === 1 ? ' one' : ''}`}>
          {f.photos!.map((p, i) => <img key={i} src={p} alt={`Foto af ${f.species}`} />)}
        </div>
      )}
      <div className="find-body">
        <div className="find-top">
          <b>
            {f.species}
            {f.pending
              ? <span className="src-tag pending">Afventer sync</span>
              : f.source === 'ai'
                ? <span className="src-tag ai">AI-forslag {f.confidence}%</span>
                : <span className="src-tag">egen bestemmelse</span>}
          </b>
          <time>{fmtLongDate(f.date)}</time>
        </div>
        <div className="find-meta">{[`${f.quantity} stk`, f.habitat, f.soil, f.spotName].filter(Boolean).join(' · ')}</div>
        {f.geo && (
          <div className="find-geo">
            <span>📍 {f.geo.lat.toFixed(5)}, {f.geo.lon.toFixed(5)}</span>
            <a href={`https://www.google.com/maps?q=${f.geo.lat},${f.geo.lon}`} target="_blank" rel="noreferrer">Åbn i kort</a>
          </div>
        )}
        {f.note && <div className="find-note">"{f.note}"</div>}
        <div className="snap">
          <div><b>{f.snapshot.rain14} mm</b><span>14 d før</span></div>
          <div><b>{f.snapshot.daysSince} d</b><span>siden regn</span></div>
          <div><b>{f.snapshot.rh}%</b><span>luftfugt</span></div>
          <div><b>{f.snapshot.tmax}°</b><span>temp</span></div>
        </div>
        {f.pending ? (
          <p className="pending-note">Gemmes lokalt — synkroniseres, når du har forbindelse igen.</p>
        ) : (
          <div className="find-foot">
            <button className="share-btn" onClick={() => openShare(f)}>
              {profile ? 'Del fundet' : 'Del — kræver profil'}
            </button>
            <button className="share-btn" onClick={() => setEditing(true)}>Rediger</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Redigering — vigtigst for at kunne tilføje et sporeaftryksbillede, når
 * det er fremkaldt timer efter selve fundet. Art og kilde kan bevidst ikke
 * ændres her: at omklassificere et fund er en større handling end at rette
 * voksested eller lægge et ekstra billede til.
 */
function EditFindForm({ find: f, onDone }: { find: FindRecord; onDone: () => void }) {
  const { updateFind, deleteFind, showToast } = useApp();
  const [habitat, setHabitat] = useState(f.habitat);
  const [soil, setSoil] = useState(f.soil);
  const [quantity, setQuantity] = useState(f.quantity);
  const [note, setNote] = useState(f.note);
  const [photos, setPhotos] = useState<string[]>(f.photos ?? []);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const shot = await shrink(file);
      setPhotos((prev) => [...prev, shot.url]);
    } catch {
      showToast('Billedet kunne ikke læses');
    }
  };

  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true);
    try {
      await updateFind(f.id, { habitat, soil, quantity: quantity || '1', note: note.trim(), photos });
      onDone();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Kunne ikke gemme ændringer');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Slet fundet af ${f.species} permanent? Det kan ikke fortrydes.`)) return;
    try {
      await deleteFind(f.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Kunne ikke slette fundet');
    }
  };

  return (
    <div className="find">
      <div className="find-body">
        <div className="find-top"><b>Rediger — {f.species}</b></div>

        {photos.length > 0 && (
          <div className="edit-shots">
            {photos.map((p, i) => (
              <div className="edit-shot" key={i}>
                <img src={p} alt="" />
                <button className="x" onClick={() => removePhoto(i)} aria-label="Fjern billede">×</button>
              </div>
            ))}
          </div>
        )}
        <button className="btn ghost" style={{ marginBottom: 14 }} onClick={() => fileRef.current?.click()}>
          + Tilføj billede — fx sporeaftrykket, når det er klar
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={addPhoto} />

        <div className="field">
          <label htmlFor={`eHab-${f.id}`}>Voksested</label>
          <select id={`eHab-${f.id}`} value={habitat} onChange={(e) => setHabitat(e.target.value)}>
            {HABITATS.map((h) => <option key={h}>{h}</option>)}
          </select>
        </div>
        <div className="field field-row">
          <div>
            <label htmlFor={`eJord-${f.id}`}>Jordtype</label>
            <select id={`eJord-${f.id}`} value={soil} onChange={(e) => setSoil(e.target.value)}>
              {SOIL_TYPES.map((j) => <option key={j}>{j}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`eAnt-${f.id}`}>Antal</label>
            <input type="text" id={`eAnt-${f.id}`} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={`eNote-${f.id}`}>Feltnote</label>
          <textarea id={`eNote-${f.id}`} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="find-foot">
          <button className="btn" style={{ flex: 2 }} onClick={save} disabled={saving}>
            {saving ? 'Gemmer…' : 'Gem ændringer'}
          </button>
          <button className="share-btn" onClick={onDone}>Annullér</button>
        </div>
        <button className="link-btn danger" onClick={remove} style={{ marginTop: 12 }}>Slet fund</button>
      </div>
    </div>
  );
}
