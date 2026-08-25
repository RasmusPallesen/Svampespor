import { SPOTS, findSpot } from './data/catalog';
import { AppProvider, useApp, type View } from './state/AppContext';
import { JagtView } from './views/JagtView';
import { BestemView } from './views/BestemView';
import { LogView } from './views/LogView';
import { FaellesView } from './views/FaellesView';
import { ProfilView } from './views/ProfilView';
import { ShareSheet } from './components/ShareSheet';
import './App.css';

const TABS: { v: View; label: string }[] = [
  { v: 'jagt', label: 'Jagten' },
  { v: 'bestem', label: 'Bestem' },
  { v: 'log', label: 'Mine fund' },
  { v: 'faelles', label: 'Fælles' },
];

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { view } = useApp();
  return (
    <div className="app">
      <Header />
      <Nav />
      <SpotChips />
      <PassiveBand />

      <div className="view on">
        {view === 'jagt' && <JagtView />}
        {view === 'bestem' && <BestemView />}
        {view === 'log' && <LogView />}
        {view === 'faelles' && <FaellesView />}
        {view === 'profil' && <ProfilView />}
      </div>

      <ShareSheet />
      <Toast />
    </div>
  );
}

function Header() {
  const { live, profile, goto } = useApp();
  return (
    <header className="app-header">
      <div>
        <div className="brand">Svampe<em>spor</em></div>
        <div className="tagline">Regn · tid · skovbund</div>
      </div>
      <div className="head-right">
        <span className={`src-badge${live ? ' live' : ''}`}>{live ? 'Open-Meteo · live' : 'demodata'}</span>
        <button className={`avatar-btn${profile ? '' : ' out'}`} aria-label="Din profil" onClick={() => goto('profil')}>
          {profile ? profile.displayName.charAt(0).toUpperCase() : '◦'}
        </button>
      </div>
    </header>
  );
}

function Nav() {
  const { view, goto } = useApp();
  return (
    <nav>
      <div className="nav-in" role="tablist">
        {TABS.map((t) => (
          <button key={t.v} className="tab" role="tab" aria-selected={view === t.v} onClick={() => goto(t.v)}>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function SpotChips() {
  const { view, activeSpotId, setActiveSpot, goto, relations } = useApp();
  if (view !== 'jagt') return null;

  const rel = (id: string) => relations[id] ?? null;
  const mine = [
    ...SPOTS.filter((s) => rel(s.id) === 'pinned'),
    ...SPOTS.filter((s) => rel(s.id) === 'followed'),
  ];

  const pick = (id: string) => { setActiveSpot(id); goto('jagt'); };

  return (
    <div className="spots" role="group" aria-label="Vælg skovområde">
      {mine.map((s) => {
        const active = s.id === activeSpotId;
        const dot = active ? 'var(--gold)' : rel(s.id) === 'pinned' ? 'var(--lichen)' : 'var(--mute)';
        return (
          <button key={s.id} className="spot-chip" aria-pressed={active} onClick={() => pick(s.id)}>
            <span className="dot" style={{ background: dot }} />{s.name}
          </button>
        );
      })}
    </div>
  );
}

function PassiveBand() {
  const { view, activeSpotId, goto } = useApp();
  if (view !== 'bestem' && view !== 'log') return null;
  const spot = findSpot(activeSpotId);
  if (!spot) return null;
  const verb = view === 'bestem' ? 'Fundet gemmes på' : 'Aktivt område';
  return (
    <div className="spot-passive">
      <span className="pin" />{verb} <b>{spot.name}</b>
      <button className="swap" onClick={() => goto('jagt')}>skift</button>
    </div>
  );
}

function Toast() {
  const { toast } = useApp();
  return <div className={`toast${toast ? ' on' : ''}`}>{toast}</div>;
}
