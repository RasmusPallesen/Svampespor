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
      <SpotSelect />
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

/**
 * Vælg aktivt skovområde. Var en vandret chip-række — voksede ubrugeligt
 * bredt, så snart man havde flere fastgjorte/fulgte steder end skærmen
 * kunne vise ad gangen (bl.a. egne GPS-tilføjede steder, der lægger sig
 * bagest). En dropdown har ingen breddegrænse og viser altid det aktive
 * sted, uanset hvor mange man har.
 */
function SpotSelect() {
  const { view, activeSpotId, setActiveSpot, goto, relations, allSpots } = useApp();
  if (view !== 'jagt') return null;

  const rel = (id: string) => relations[id] ?? null;
  const pinned = allSpots.filter((s) => rel(s.id) === 'pinned');
  const followed = allSpots.filter((s) => rel(s.id) === 'followed');
  if (pinned.length === 0 && followed.length === 0) return null;

  // Det aktive sted kan i princippet være valgt uden om denne liste (fx via
  // "Bedst i dag"-rangeringen, uden at være fastgjort/fulgt) — uden dette
  // ville <select> enten vise et forkert sted som valgt, eller intet.
  const known = new Set([...pinned, ...followed].map((s) => s.id));
  const active = !known.has(activeSpotId) ? allSpots.find((s) => s.id === activeSpotId) : undefined;

  const pick = (id: string) => { setActiveSpot(id); goto('jagt'); };

  return (
    <div className="spot-select-wrap">
      <select
        className="spot-select"
        aria-label="Vælg skovområde"
        value={activeSpotId}
        onChange={(e) => pick(e.target.value)}
      >
        {active && <option value={active.id}>{active.name}</option>}
        {pinned.length > 0 && (
          <optgroup label="Fastgjort">
            {pinned.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </optgroup>
        )}
        {followed.length > 0 && (
          <optgroup label="Fulgt">
            {followed.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </optgroup>
        )}
      </select>
      <span className="spot-select-chevron">▾</span>
    </div>
  );
}

function PassiveBand() {
  const { view, activeSpotId, goto, allSpots } = useApp();
  if (view !== 'bestem' && view !== 'log') return null;
  const spot = allSpots.find((s) => s.id === activeSpotId);
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
