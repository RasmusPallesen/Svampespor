import { useState } from 'react';

import { PLATFORMS } from '../data/catalog';
import { useApp } from '../state/AppContext';
import type { ProfilePrefs } from '../lib/data/types';

const PREF_TEXT: { key: keyof ProfilePrefs; title: string; body: string }[] = [
  { key: 'blur', title: 'Skjul den præcise plet', body: 'Delekortet viser skovområdet, aldrig koordinaterne. Anbefales.' },
  { key: 'weather', title: 'Vis vejrdata på kortet', body: 'Regnmængde og dage siden regn. Det er den del, folk kommenterer på.' },
  { key: 'caption', title: 'Skriv teksten for mig', body: 'Foreslår en billedtekst tilpasset den enkelte platform.' },
];

export function ProfilView() {
  const { profile } = useApp();
  return profile ? <ProfileCard /> : <CreateProfile />;
}

function CreateProfile() {
  const { createProfile, showToast } = useApp();
  const [name, setName] = useState('');

  const submit = () => {
    const n = name.trim();
    if (!n) { showToast('Skriv et visningsnavn'); return; }
    createProfile(n);
    showToast('Profil oprettet');
  };

  return (
    <div className="panel">
      <div className="panel-label">Din profil</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--lichen)', marginBottom: 16 }}>
        En profil samler dine fund på tværs af sæsoner, lader dig dele dem, og gør dine egne vejrmønstre til noget,
        appen kan regne på. Dine pletter forbliver dine — kun det, du selv deler, forlader telefonen.
      </p>
      <div className="field">
        <label htmlFor="pName">Visningsnavn</label>
        <input type="text" id="pName" placeholder="Rasmus" autoComplete="nickname" value={name}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
      </div>
      <button className="btn" onClick={submit}>Opret profil</button>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '.06em', color: 'var(--mute)', marginTop: 12, lineHeight: 1.6 }}>
        PROTOTYPE — INGEN ADGANGSKODE, INGEN DATA FORLADER DENNE SIDE.<br />
        I det rigtige byg: Supabase Auth med Apple/Google-login.
      </p>
    </div>
  );
}

function ProfileCard() {
  const { profile, finds, setHandle, togglePref, logOut } = useApp();
  if (!profile) return null;

  const arter = new Set(finds.map((f) => f.species)).size;
  const dage = new Set(finds.map((f) => f.date)).size;
  const initial = profile.displayName.charAt(0).toUpperCase();

  return (
    <>
      <div className="panel">
        <div className="prof-head">
          <div className="prof-av">{initial}</div>
          <div className="prof-name"><b>{profile.displayName}</b><span>Svampesamler siden 2025</span></div>
        </div>
        <div className="prof-stats">
          <div><b>{finds.length}</b><span>fund</span></div>
          <div><b>{arter}</b><span>arter</span></div>
          <div><b>{dage}</b><span>dage i felten</span></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-label">Dine profiler</div>
        <p style={{ fontSize: 12.5, color: 'var(--mute)', lineHeight: 1.5, marginBottom: 6 }}>
          Brugernavnet skrives ind i delekortet og i den færdige tekst, så din konto bliver krediteret, når nogen deler dit fund videre.
        </p>
        {PLATFORMS.map((p) => (
          <div className="handle-row" key={p.k}>
            <div className="hicon">{p.ic}</div>
            <span className="hname">{p.n}</span>
            <input className="hin" value={profile.handles[p.k] ?? ''} placeholder={p.ph}
              onChange={(e) => setHandle(p.k, e.target.value)} />
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-label">Sådan deles dine fund</div>
        {PREF_TEXT.map((pref) => (
          <div className="pref" key={pref.key}>
            <div><b>{pref.title}</b><p>{pref.body}</p></div>
            <button className="switch" role="switch" aria-checked={profile.prefs[pref.key]}
              onClick={() => togglePref(pref.key)} />
          </div>
        ))}
      </div>

      <div className="panel">
        <button className="btn ghost" onClick={logOut}>Log ud</button>
      </div>
    </>
  );
}
