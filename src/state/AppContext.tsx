/**
 * Appens tilstand — ét sted.
 *
 * Prototypen holdt alt i globale variabler; her bor det i en context med
 * rene actions. Vejr caches pr. sted; fund og profil går gennem datalaget
 * (`getRepo()`), så et skift til Supabase ikke rører komponenterne.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';

import { SPECIES, SPOTS, type CatalogSpecies } from '../data/catalog';
import { simulateWeather } from '../data/demoWeather';
import { getRepo } from '../lib/data/repo';
import type { FindInput, FindRecord, Profile, ProfilePrefs } from '../lib/data/types';
import type { WeatherSeries } from '../lib/weather/model';
import { fetchForSpots } from '../lib/weather/openMeteo';
import type { Relation } from '../lib/spots/ranking';

export type Segment = 'idag' | 'mine';
export type View = 'jagt' | 'bestem' | 'log' | 'faelles' | 'profil';

const DEFAULT_RELATIONS: Record<string, Relation> = {
  dyrehaven: 'pinned', gribskov: 'pinned',
  rude: 'followed', tisvilde: 'followed', vestskoven: 'followed',
};

interface AppState {
  repoPersistent: boolean;
  today: Date;

  weather: Record<string, WeatherSeries>;
  live: boolean;
  weatherReady: boolean;

  finds: FindRecord[];
  addFind(input: FindInput): Promise<void>;
  setShared(id: string, shared: boolean): Promise<void>;

  profile: Profile | null;
  createProfile(displayName: string): Promise<void>;
  logOut(): Promise<void>;
  setHandle(key: string, value: string): void;
  togglePref(key: keyof ProfilePrefs): void;

  activeSpotId: string;
  setActiveSpot(id: string): void;

  targetSpecies: CatalogSpecies;
  setTargetSpeciesName(name: string): void;

  relations: Record<string, Relation>;
  cycleRelation(id: string, want: Relation): void;

  segment: Segment;
  setSegment(s: Segment): void;
  showHidden: boolean;
  toggleHidden(): void;

  sharing: boolean;
  setSharing(v: boolean): void;

  view: View;
  goto(v: View): void;

  shareFind: FindRecord | null;
  openShare(find: FindRecord): void;
  closeShare(): void;

  toast: string | null;
  showToast(msg: string): void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp skal bruges inden i <AppProvider>');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => getRepo(), []);
  const today = useMemo(() => new Date(), []);

  const [weather, setWeather] = useState<Record<string, WeatherSeries>>({});
  const [live, setLive] = useState(false);
  const [weatherReady, setWeatherReady] = useState(false);

  const [finds, setFinds] = useState<FindRecord[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [activeSpotId, setActiveSpotId] = useState<string>(SPOTS[0].id);
  const [targetName, setTargetName] = useState<string>(SPECIES[0].nameDa);
  const [relations, setRelations] = useState<Record<string, Relation>>(DEFAULT_RELATIONS);
  const [segment, setSegment] = useState<Segment>('idag');
  const [showHidden, setShowHidden] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [view, setView] = useState<View>('jagt');
  const [shareFind, setShareFind] = useState<FindRecord | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  /* ---- boot: hent fund + vejr for alle steder ---- */
  useEffect(() => {
    repo.listFinds().then(setFinds).catch(() => setFinds([]));
    repo.getProfile().then(setProfile).catch(() => {});
  }, [repo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const meta = SPOTS.map((s) => ({ id: s.id, lat: s.lat, lon: s.lon }));
      try {
        const got = await fetchForSpots(meta);
        if (cancelled) return;
        setWeather(got);
        setLive(true);
      } catch {
        if (cancelled) return;
        const sim: Record<string, WeatherSeries> = {};
        for (const s of SPOTS) sim[s.id] = simulateWeather(s.lat, s.lon, today);
        setWeather(sim);
        setLive(false);
      } finally {
        if (!cancelled) setWeatherReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [today]);

  /* ---- fund ---- */
  const addFind = useCallback(async (input: FindInput) => {
    const rec = await repo.addFind(input);
    setFinds((prev) => [rec, ...prev]);
  }, [repo]);

  const setShared = useCallback(async (id: string, shared: boolean) => {
    await repo.setShared(id, shared);
    setFinds((prev) => prev.map((f) => (f.id === id ? { ...f, shared } : f)));
  }, [repo]);

  /* ---- profil ---- */
  const persistProfile = useCallback((p: Profile | null) => {
    setProfile(p);
    repo.saveProfile(p).catch(() => {});
  }, [repo]);

  const createProfile = useCallback(async (displayName: string) => {
    persistProfile({ displayName, handles: {}, prefs: { blur: true, weather: true, caption: true } });
  }, [persistProfile]);

  const logOut = useCallback(async () => { persistProfile(null); }, [persistProfile]);

  const setHandle = useCallback((key: string, value: string) => {
    setProfile((p) => {
      if (!p) return p;
      const next = { ...p, handles: { ...p.handles, [key]: value } };
      repo.saveProfile(next).catch(() => {});
      return next;
    });
  }, [repo]);

  const togglePref = useCallback((key: keyof ProfilePrefs) => {
    setProfile((p) => {
      if (!p) return p;
      const next = { ...p, prefs: { ...p.prefs, [key]: !p.prefs[key] } };
      repo.saveProfile(next).catch(() => {});
      return next;
    });
  }, [repo]);

  /* ---- steder + relationer ---- */
  const cycleRelation = useCallback((id: string, want: Relation) => {
    setRelations((prev) => {
      const current = prev[id] ?? null;
      if (current === want) return { ...prev, [id]: 'followed' };
      if (want === 'pinned') {
        const pinned = Object.values(prev).filter((r) => r === 'pinned').length;
        if (pinned >= 5 && current !== 'pinned') {
          showToast('Maks fem fastgjorte — frigør et først');
          return prev;
        }
      }
      return { ...prev, [id]: want };
    });
  }, [showToast]);

  const goto = useCallback((v: View) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openShare = useCallback((find: FindRecord) => {
    if (!profile) {
      goto('profil');
      showToast('Opret en profil for at dele');
      return;
    }
    setShareFind(find);
  }, [profile, goto, showToast]);

  const closeShare = useCallback(() => setShareFind(null), []);

  const targetSpecies = useMemo(
    () => SPECIES.find((s) => s.nameDa === targetName) ?? SPECIES[0],
    [targetName],
  );

  const value: AppState = {
    repoPersistent: repo.persistent,
    today,
    weather, live, weatherReady,
    finds, addFind, setShared,
    profile, createProfile, logOut, setHandle, togglePref,
    activeSpotId, setActiveSpot: setActiveSpotId,
    targetSpecies, setTargetSpeciesName: setTargetName,
    relations, cycleRelation,
    segment, setSegment, showHidden, toggleHidden: () => setShowHidden((v) => !v),
    sharing, setSharing,
    view, goto,
    shareFind, openShare, closeShare,
    toast, showToast,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
