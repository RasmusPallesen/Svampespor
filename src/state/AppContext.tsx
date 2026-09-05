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
import { signInWithApple, signInWithGoogle, signInWithMagicLink, signOutAuth } from '../lib/auth/auth';
import { enqueueFind, isOfflineLikeError, listQueuedFinds, removeQueuedFind } from '../lib/data/offlineQueue';
import { getRepo } from '../lib/data/repo';
import { getSupabase } from '../lib/data/supabaseClient';
import type { FindInput, FindRecord, FindUpdate, Profile, ProfilePrefs, SpeciesProposal, UserSpotInput } from '../lib/data/types';
import type { WeatherSeries } from '../lib/weather/model';
import { fetchForSpots } from '../lib/weather/openMeteo';
import type { Relation, Spot } from '../lib/spots/ranking';

export interface AuthUser {
  id: string;
  email: string | null;
  /** navn foreslået af OAuth-udbyderen — bruges til at forududfylde visningsnavn */
  suggestedName: string | null;
}

export type Segment = 'idag' | 'mine';
export type View = 'jagt' | 'bestem' | 'log' | 'faelles' | 'profil';

/** Navnene er kun til at slå id'et op i SPOTS — id'erne selv er ægte UUID'er. */
const DEFAULT_RELATION_NAMES: [string, Relation][] = [
  ['Dyrehaven', 'pinned'], ['Gribskov', 'pinned'],
  ['Rude Skov', 'followed'], ['Tisvilde Hegn', 'followed'], ['Vestskoven', 'followed'],
];
const DEFAULT_RELATIONS: Record<string, Relation> = Object.fromEntries(
  DEFAULT_RELATION_NAMES.map(([name, rel]) => [SPOTS.find((s) => s.name === name)?.id ?? name, rel]),
);

/** Overlever en genindlæsning — se hvorfor ved `setActiveSpotId` nedenfor. */
const ACTIVE_SPOT_KEY = 'svampespor:activeSpotId';

interface AppState {
  repoPersistent: boolean;
  today: Date;

  weather: Record<string, WeatherSeries>;
  live: boolean;
  weatherReady: boolean;

  finds: FindRecord[];
  /** Antal fund, der ligger i den lokale offline-kø og afventer forbindelse. */
  pendingFinds: number;
  addFind(input: FindInput): Promise<void>;
  updateFind(id: string, patch: FindUpdate): Promise<void>;
  deleteFind(id: string): Promise<void>;
  setShared(id: string, shared: boolean): Promise<void>;

  profile: Profile | null;
  createProfile(displayName: string): Promise<void>;
  logOut(): Promise<void>;
  setHandle(key: string, value: string): void;
  togglePref(key: keyof ProfilePrefs): void;

  /** null = ikke logget ind (kun relevant i Supabase-tilstand). */
  authUser: AuthUser | null;
  authReady: boolean;
  authWithGoogle(): Promise<void>;
  authWithApple(): Promise<void>;
  authWithMagicLink(email: string): Promise<void>;

  activeSpotId: string;
  setActiveSpot(id: string): void;

  /** Systemsteder + brugerens egne, samlet — brug denne, ikke SPOTS direkte. */
  allSpots: Spot[];
  /** Tilføjer et sted ud fra givne koordinater (typisk brugerens nuværende position). */
  addUserSpot(input: UserSpotInput): Promise<Spot>;

  targetSpecies: CatalogSpecies;
  setTargetSpeciesName(name: string): void;

  /**
   * Kernearter + fællesskabsarter samlet — brug denne til at vise/vælge
   * blandt ALLE kendte arter (fx Log et fund). `targetSpecies`/Jager-vælgeren
   * bruger bevidst kun kernearterne (SPECIES), ikke denne — rangeringen
   * forudsætter data, uverificerede fællesskabsarter endnu ikke har.
   */
  allSpecies: CatalogSpecies[];
  /** Gemmer et Bestem-forslag som fællesskabsart, hvis det ikke allerede er en kerneart. Fejler stille. */
  ensureSpecies(proposal: SpeciesProposal): Promise<void>;

  relations: Record<string, Relation>;
  cycleRelation(id: string, want: Relation): void;

  segment: Segment;
  setSegment(s: Segment): void;
  showHidden: boolean;
  toggleHidden(): void;

  sharing: boolean;
  setSharing(v: boolean): void;

  /** Eksplicit samtykke til at logge præcis position ved fund (CLAUDE.md regel 3). */
  logLocation: boolean;
  setLogLocation(v: boolean): void;

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
  const [pendingFinds, setPendingFinds] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [communitySpecies, setCommunitySpecies] = useState<CatalogSpecies[]>([]);
  const [userSpots, setUserSpots] = useState<Spot[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [activeSpotId, setActiveSpotIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_SPOT_KEY) || SPOTS[0].id;
    } catch {
      return SPOTS[0].id; // fx Safari privat browsing, hvor storage kan kaste
    }
  });
  // Uden dette bouncede en genindlæsning altid tilbage til Gribskov —
  // også når det aktive sted var ens eget nytilføjede, ikke et systemsted.
  // Selve stedet valideres ikke her: peger id'et på et brugersted, der endnu
  // ikke er hentet (userSpots er tom lige efter boot), viser JagtView bare
  // "LÆSER SKOVBUNDEN…", indtil refreshUserSpots har fyldt allSpots ud.
  const setActiveSpotId = useCallback((id: string) => {
    setActiveSpotIdState(id);
    try { localStorage.setItem(ACTIVE_SPOT_KEY, id); } catch { /* ingen storage — ikke fatalt */ }
  }, []);
  const [targetName, setTargetName] = useState<string>(SPECIES[0].nameDa);
  const [relations, setRelations] = useState<Record<string, Relation>>(DEFAULT_RELATIONS);
  const [segment, setSegment] = useState<Segment>('idag');
  const [showHidden, setShowHidden] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [logLocation, setLogLocation] = useState(false);
  const [view, setView] = useState<View>('jagt');
  const [shareFind, setShareFind] = useState<FindRecord | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  /* ---- brugerens egne steder ----
   * Systemsteder fylder vejret ved boot (effekten nedenfor); et brugertilføjet
   * sted dukker først op senere — enten hentet ved login, eller oprettet midt
   * i en session — så det henter sit eget vejr med det samme i stedet for at
   * vente på en ny fuld runde.
   */
  const fetchSpotWeather = useCallback(async (spots: Spot[]) => {
    if (!spots.length) return;
    try {
      const { weather: got } = await fetchForSpots(spots.map((s) => ({ id: s.id, lat: s.lat, lon: s.lon })));
      setWeather((prev) => ({ ...prev, ...got }));
    } catch {
      setWeather((prev) => {
        const next = { ...prev };
        for (const s of spots) next[s.id] = simulateWeather(s.lat, s.lon, today);
        return next;
      });
    }
  }, [today]);

  // `syncFindsAndProfile` kalder denne både fra getSession() og fra
  // onAuthStateChange — de kan i teorien lande i vilkårlig rækkefølge. Uden
  // dette id-tjek kunne et tidligt, endnu-ikke-hydreret kald (ingen session
  // endnu, tomt resultat) nå at overskrive et senere kalds rigtige data,
  // hvis det af en eller anden grund resolver efter. Kun det seneste kald
  // vinder, uanset hvilket der rent faktisk svarer sidst.
  const userSpotsCallId = useRef(0);
  const refreshUserSpots = useCallback(async () => {
    const callId = ++userSpotsCallId.current;
    try {
      const spots = await repo.listUserSpots();
      if (userSpotsCallId.current !== callId) return;
      setUserSpots(spots);
      void fetchSpotWeather(spots);
    } catch {
      if (userSpotsCallId.current === callId) setUserSpots([]);
    }
  }, [repo, fetchSpotWeather]);

  const addUserSpot = useCallback(async (input: UserSpotInput) => {
    const spot = await repo.addUserSpot(input);
    setUserSpots((prev) => [...prev, spot]);
    void fetchSpotWeather([spot]);
    return spot;
  }, [repo, fetchSpotWeather]);

  const allSpots = useMemo(() => [...SPOTS, ...userSpots], [userSpots]);

  /* ---- boot + auth: hent fund/profil, og hold dem i sync med login-status ----
   * Session-adapteren har ingen rigtig auth — hent bare med det samme. I
   * Supabase-tilstand afgør RLS, hvad et kald ser, så et login/logout skal
   * udløse et nyt hent af begge dele, ikke kun ved første render.
   */
  useEffect(() => {
    const db = getSupabase();
    const syncFindsAndProfile = () => {
      repo.listFinds().then(setFinds).catch(() => setFinds([]));
      repo.getProfile().then(setProfile).catch(() => setProfile(null));
      refreshUserSpots();
    };

    if (!db) {
      syncFindsAndProfile();
      setAuthReady(true);
      return;
    }

    const syncUser = (
      u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined,
    ) => {
      setAuthUser(
        u
          ? {
              id: u.id,
              email: u.email ?? null,
              suggestedName: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || null,
            }
          : null,
      );
    };

    db.auth.getSession().then(({ data }) => {
      syncUser(data.session?.user);
      syncFindsAndProfile();
      setAuthReady(true);
    });

    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      syncUser(session?.user);
      syncFindsAndProfile();
    });

    return () => sub.subscription.unsubscribe();
  }, [repo, refreshUserSpots]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const meta = SPOTS.map((s) => ({ id: s.id, lat: s.lat, lon: s.lon }));
      try {
        const { weather: got, liveCells } = await fetchForSpots(meta);
        if (cancelled) return;
        setWeather(got);
        // "Live" betyder her "mindst ét gitterfelt fik svar" — fetchForSpots
        // simulerer allerede enkeltvis pr. celle, så et par fjerne steder,
        // der ramte en 429, skal ikke tvinge HELE appen i demodata, når
        // resten reelt har rigtigt vejr.
        setLive(liveCells > 0);
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

  /* ---- fællesskabsarter (Tier 2) — offentligt læsbare, ikke auth-afhængige ---- */
  const refreshCommunitySpecies = useCallback(() => {
    repo.listCommunitySpecies().then(setCommunitySpecies).catch(() => setCommunitySpecies([]));
  }, [repo]);

  useEffect(() => { refreshCommunitySpecies(); }, [refreshCommunitySpecies]);

  const ensureSpecies = useCallback(async (proposal: SpeciesProposal) => {
    try {
      await repo.ensureSpecies(proposal);
      refreshCommunitySpecies();
    } catch {
      // Stille fejl med vilje: fundet er allerede gemt (addFind kører før
      // dette kaldes) — at fællesskabsarten ikke blev registreret er en
      // mindre ting, ikke noget der skal afbryde eller alarmere brugeren.
    }
  }, [repo, refreshCommunitySpecies]);

  const allSpecies = useMemo(() => [...SPECIES, ...communitySpecies], [communitySpecies]);

  /* ---- fund ----
   * addFind prøver Supabase først; fejler den fordi der reelt ikke er
   * forbindelse (isOfflineLikeError), lægges fundet i den lokale kø i
   * stedet for at fejle synligt — det er hele pointen med at stå i en skov
   * uden dækning stadig kan logge et fund. En rigtig fejl (ikke logget ind,
   * RLS, validering) kastes videre som før, uændret for LogView/BestemView.
   */
  const flushingRef = useRef(false);
  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      const queued = await listQueuedFinds().catch(() => []);
      setPendingFinds(queued.length);
      for (const q of queued) {
        try {
          const rec = await repo.addFind(q.input);
          await removeQueuedFind(q.localId).catch(() => {});
          // Erstat en evt. placeholder fra addFind i denne session — eller
          // sæt fundet ind på ny, hvis det stod i køen fra en tidligere
          // session, der blev lukket, før forbindelsen kom tilbage (så det
          // aldrig blev til en placeholder i det nuværende `finds`).
          setFinds((prev) => {
            const exists = prev.some((f) => f.id === q.localId);
            return exists ? prev.map((f) => (f.id === q.localId ? rec : f)) : [rec, ...prev];
          });
          setPendingFinds((n) => Math.max(0, n - 1));
        } catch {
          // Stadig ingen forbindelse (eller samme fejl gentager sig) — stop
          // denne runde, prøv igen ved næste 'online'-event eller boot.
          break;
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [repo]);

  useEffect(() => {
    flushQueue(); // fund fra en tidligere session, der aldrig nåede at synkronisere
    window.addEventListener('online', flushQueue);
    return () => window.removeEventListener('online', flushQueue);
  }, [flushQueue]);

  const addFind = useCallback(async (input: FindInput) => {
    try {
      const rec = await repo.addFind(input);
      setFinds((prev) => [rec, ...prev]);
      void flushQueue(); // lykkedes dette, er der tydeligvis forbindelse igen
    } catch (err) {
      if (!isOfflineLikeError(err)) throw err;
      const queued = await enqueueFind(input);
      setPendingFinds((n) => n + 1);
      setFinds((prev) => [{ ...input, id: queued.localId, shared: false, pending: true }, ...prev]);
    }
  }, [repo, flushQueue]);

  const updateFind = useCallback(async (id: string, patch: FindUpdate) => {
    const rec = await repo.updateFind(id, patch);
    setFinds((prev) => prev.map((f) => (f.id === id ? rec : f)));
  }, [repo]);

  const deleteFind = useCallback(async (id: string) => {
    await repo.deleteFind(id);
    setFinds((prev) => prev.filter((f) => f.id !== id));
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

  const logOut = useCallback(async () => {
    persistProfile(null);
    await signOutAuth();
  }, [persistProfile]);

  const authWithGoogle = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Google-login fejlede');
    }
  }, [showToast]);

  const authWithApple = useCallback(async () => {
    try {
      await signInWithApple();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Apple-login fejlede');
    }
  }, [showToast]);

  const authWithMagicLink = useCallback(async (email: string) => {
    await signInWithMagicLink(email);
  }, []);

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
    finds, pendingFinds, addFind, updateFind, deleteFind, setShared,
    profile, createProfile, logOut, setHandle, togglePref,
    authUser, authReady, authWithGoogle, authWithApple, authWithMagicLink,
    activeSpotId, setActiveSpot: setActiveSpotId,
    allSpots, addUserSpot,
    targetSpecies, setTargetSpeciesName: setTargetName,
    allSpecies, ensureSpecies,
    relations, cycleRelation,
    segment, setSegment, showHidden, toggleHidden: () => setShowHidden((v) => !v),
    sharing, setSharing,
    logLocation, setLogLocation,
    view, goto,
    shareFind, openShare, closeShare,
    toast, showToast,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
