/**
 * Datalag — ét interface, to adaptere.
 *
 *   SessionRepo   fund i hukommelsen, seedet med demodata. Bruges når der
 *                 ingen Supabase-forbindelse er. Aldrig localStorage: fund
 *                 har Supabase som sandhed, jf. CLAUDE.md.
 *   SupabaseRepo  rigtige rækker med RLS. Aktiveres af .env og kræver auth.
 *
 * UI'et kender kun `Repo`. At skifte adapter ændrer intet i komponenterne.
 */

import { communitySpeciesFrom, type CatalogSpecies } from '../../data/catalog';
import type { Spot } from '../spots/ranking';
import { SEED_FEED, seedFinds } from './seed';
import { getSupabase } from './supabaseClient';
import type { FeedItem, FindInput, FindRecord, FindUpdate, Profile, SpeciesProposal, UserSpotInput } from './types';

/** Rejsetid kan ikke afledes af GPS-koordinater alene — se `addUserSpot`-kommentaren. */
const DEFAULT_USER_SPOT_TRAVEL_MIN = 20;

export interface Repo {
  /** Er dette laget, der rent faktisk persisterer? */
  readonly persistent: boolean;
  listFinds(): Promise<FindRecord[]>;
  addFind(input: FindInput): Promise<FindRecord>;
  /** Ret voksested/jordtype/antal/note, eller tilføj et billede (fx et sporeaftryk klar timer senere). */
  updateFind(id: string, patch: FindUpdate): Promise<FindRecord>;
  deleteFind(id: string): Promise<void>;
  setShared(id: string, shared: boolean): Promise<void>;
  getProfile(): Promise<Profile | null>;
  saveProfile(profile: Profile | null): Promise<void>;
  listFeed(): Promise<FeedItem[]>;
  /** Tier 2: uverificerede arter, Bestem selv har foreslået. Se docs/roadmap.md. */
  listCommunitySpecies(): Promise<CatalogSpecies[]>;
  /** Gemmer et Bestem-forslag som ny fællesskabsart, hvis navnet ikke allerede findes. */
  ensureSpecies(proposal: SpeciesProposal): Promise<void>;
  /** Brugerens egne steder — kun synlige for dem selv (RLS), i modsætning til systemsteder. */
  listUserSpots(): Promise<Spot[]>;
  addUserSpot(input: UserSpotInput): Promise<Spot>;
}

/* ------------------------------------------------------------------ */
/* Session — hukommelse                                                */
/* ------------------------------------------------------------------ */

class SessionRepo implements Repo {
  readonly persistent = false;
  private finds: FindRecord[] = seedFinds();
  private profile: Profile | null = null;
  private seq = 0;
  private communitySpecies: CatalogSpecies[] = [];
  private userSpots: Spot[] = [];
  private spotSeq = 0;

  async listFinds() {
    return [...this.finds];
  }

  async addFind(input: FindInput) {
    const rec: FindRecord = { ...input, id: `local-${++this.seq}`, shared: false };
    this.finds = [rec, ...this.finds];
    return rec;
  }

  async updateFind(id: string, patch: FindUpdate) {
    let updated: FindRecord | undefined;
    this.finds = this.finds.map((f) => {
      if (f.id !== id) return f;
      updated = { ...f, ...patch };
      return updated;
    });
    if (!updated) throw new Error('Fund findes ikke');
    return updated;
  }

  async deleteFind(id: string) {
    this.finds = this.finds.filter((f) => f.id !== id);
  }

  async setShared(id: string, shared: boolean) {
    this.finds = this.finds.map((f) => (f.id === id ? { ...f, shared } : f));
  }

  async getProfile() {
    return this.profile;
  }

  async saveProfile(profile: Profile | null) {
    this.profile = profile;
  }

  async listFeed() {
    return SEED_FEED;
  }

  async listCommunitySpecies() {
    return [...this.communitySpecies];
  }

  async ensureSpecies(proposal: SpeciesProposal) {
    const exists = this.communitySpecies.some(
      (s) => s.nameDa.toLowerCase() === proposal.nameDa.toLowerCase(),
    );
    if (exists) return;
    this.communitySpecies = [
      ...this.communitySpecies,
      communitySpeciesFrom({
        nameDa: proposal.nameDa, nameLat: proposal.nameLat,
        window: proposal.window, rainMm: proposal.rainMm, lookalikes: proposal.lookalikes,
      }),
    ];
  }

  async listUserSpots() {
    return [...this.userSpots];
  }

  async addUserSpot(input: UserSpotInput): Promise<Spot> {
    const spot: Spot = {
      id: `user-spot-${++this.spotSeq}`,
      name: input.name,
      region: input.region?.trim() || 'Eget sted',
      lat: input.lat,
      lon: input.lon,
      travelMin: DEFAULT_USER_SPOT_TRAVEL_MIN,
      habitats: [],
    };
    this.userSpots = [...this.userSpots, spot];
    return spot;
  }
}

/* ------------------------------------------------------------------ */
/* Supabase — rigtige rækker                                           */
/* ------------------------------------------------------------------ */

/**
 * Kortlægger mellem app-typer og skemaet i supabase/migrations/0001_init.sql.
 * Kræver en indlogget bruger; RLS sørger for, at man kun ser sine egne fund.
 * Fuld auth-flow hører til et senere roadmap-punkt — indtil da falder
 * `getRepo()` tilbage til SessionRepo, når nøglerne mangler.
 */
const FIND_COLUMNS =
  'id, species_text, habitat, soil, quantity, spot_id, found_at, note, weather, id_source, id_confidence, shared, lat, lon, photos';

/** Delt mellem listFinds/updateFind, så de to aldrig kan komme til at mappe forskelligt. */
function mapFindRow(r: Record<string, any>): FindRecord {
  return {
    id: r.id,
    species: r.species_text ?? 'Ukendt',
    habitat: r.habitat ?? '',
    soil: r.soil ?? '',
    quantity: r.quantity != null ? String(r.quantity) : '1',
    spotId: r.spot_id ?? '',
    spotName: r.weather?.spotName ?? '',
    note: r.note ?? '',
    date: r.found_at,
    snapshot: r.weather?.snapshot ?? { rain14: 0, daysSince: 0, rh: 0, tmax: 0 },
    photos: Array.isArray(r.photos) && r.photos.length > 0 ? r.photos : undefined,
    source: r.id_source,
    confidence: r.id_confidence ?? undefined,
    shared: r.shared,
    geo: r.lat != null && r.lon != null ? { lat: r.lat, lon: r.lon } : null,
  };
}

class SupabaseRepo implements Repo {
  readonly persistent = true;
  constructor(private readonly db = getSupabase()!) {}

  /**
   * `getSession()`, ikke `getUser()` — sessionen læses lokalt fra opbevaret
   * token, uden en netværkstur. Vigtigt for offline-køen (offlineQueue.ts):
   * en logget-ind bruger uden forbindelse skal opfattes som logget ind, med
   * selve fund-skrivningen (som reelt kræver netværk) som det, der udløser
   * "gem lokalt" — ikke en falsk "log ind"-fejl fra selve login-tjekket.
   */
  private async userId(): Promise<string | null> {
    const { data } = await this.db.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async listFinds(): Promise<FindRecord[]> {
    const { data, error } = await this.db
      .from('finds')
      .select(FIND_COLUMNS)
      .order('found_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapFindRow);
  }

  async addFind(input: FindInput): Promise<FindRecord> {
    const uid = await this.userId();
    if (!uid) throw new Error('Log ind for at gemme fund');
    const { data, error } = await this.db
      .from('finds')
      .insert({
        user_id: uid,
        species_text: input.species,
        habitat: input.habitat,
        soil: input.soil,
        quantity: Number(input.quantity) || null,
        spot_id: input.spotId,
        found_at: input.date,
        note: input.note,
        weather: { snapshot: input.snapshot, spotName: input.spotName },
        photos: input.photos ?? [],
        id_source: input.source,
        id_confidence: input.confidence ?? null,
        shared: false,
        // WKT — Postgres' geography_in() accepter et rent tekstpunkt.
        geom: input.geo ? `POINT(${input.geo.lon} ${input.geo.lat})` : null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return { ...input, id: data.id, shared: false };
  }

  async updateFind(id: string, patch: FindUpdate): Promise<FindRecord> {
    const row: Record<string, unknown> = {};
    if (patch.habitat !== undefined) row.habitat = patch.habitat;
    if (patch.soil !== undefined) row.soil = patch.soil;
    if (patch.quantity !== undefined) row.quantity = Number(patch.quantity) || null;
    if (patch.note !== undefined) row.note = patch.note;
    if (patch.photos !== undefined) row.photos = patch.photos;
    const { data, error } = await this.db
      .from('finds')
      .update(row)
      .eq('id', id)
      .select(FIND_COLUMNS)
      .single();
    if (error) throw error;
    return mapFindRow(data);
  }

  async deleteFind(id: string) {
    const { error } = await this.db.from('finds').delete().eq('id', id);
    if (error) throw error;
  }

  async setShared(id: string, shared: boolean) {
    const { error } = await this.db.from('finds').update({ shared }).eq('id', id);
    if (error) throw error;
  }

  async getProfile(): Promise<Profile | null> {
    const uid = await this.userId();
    if (!uid) return null;
    const { data, error } = await this.db
      .from('profiles')
      .select('display_name, handles, prefs')
      .eq('id', uid)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { displayName: data.display_name, handles: data.handles ?? {}, prefs: data.prefs };
  }

  async saveProfile(profile: Profile | null) {
    const uid = await this.userId();
    if (!uid || !profile) return;
    const { error } = await this.db.from('profiles').upsert({
      id: uid,
      display_name: profile.displayName,
      handles: profile.handles,
      prefs: profile.prefs,
    });
    if (error) throw error;
  }

  async listFeed(): Promise<FeedItem[]> {
    // community_finds-view'et findes, men uden auth og rigtige profiler er
    // seed-feedet mere illustrativt end en tom liste.
    return SEED_FEED;
  }

  async listCommunitySpecies(): Promise<CatalogSpecies[]> {
    // Kun de uverificerede — kernearterne er allerede i src/data/catalog.ts
    // med rigere, Svampeatlas-sourcet data. At hente dem her ville bare give
    // en dårligere duplikat af noget, appen allerede har.
    const { data, error } = await this.db
      .from('species')
      .select('name_da, name_lat, window_lo, window_hi, rain_mm, lookalikes')
      .eq('reviewed', false);
    if (error) throw error;
    return (data ?? []).map((r) =>
      communitySpeciesFrom({
        nameDa: r.name_da, nameLat: r.name_lat ?? '',
        window: [r.window_lo, r.window_hi], rainMm: Number(r.rain_mm),
        lookalikes: r.lookalikes ?? [],
      }),
    );
  }

  async ensureSpecies(proposal: SpeciesProposal): Promise<void> {
    // ignoreDuplicates → ON CONFLICT (name_da) DO NOTHING: findes arten
    // allerede (kerne- eller tidligere fællesskabsart), rører vi den ikke.
    // Kræver ikke en UPDATE-politik, kun INSERT — mindste fornødne rettighed.
    const { error } = await this.db.from('species').upsert(
      {
        name_da: proposal.nameDa,
        name_lat: proposal.nameLat,
        window_lo: proposal.window[0],
        window_hi: proposal.window[1],
        rain_mm: proposal.rainMm,
        lookalikes: proposal.lookalikes,
        source: 'ai',
        reviewed: false,
      },
      { onConflict: 'name_da', ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  async listUserSpots(): Promise<Spot[]> {
    const uid = await this.userId();
    if (!uid) return []; // ikke logget ind — ingen egne steder at hente endnu
    const { data, error } = await this.db
      .from('spots')
      .select('id, name, region, lat, lon')
      .eq('source', 'user')
      .eq('owner_id', uid)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r): Spot => ({
      id: r.id,
      name: r.name,
      region: r.region ?? 'Eget sted',
      lat: r.lat,
      lon: r.lon,
      // Rejsetid kan ikke afledes af koordinaterne alene, og `user_spots.travel_min`
      // (skemaets tiltænkte plads til det) er ikke i brug endnu — samme
      // pragmatiske grænse som resten af rangeringen kører med i dag.
      travelMin: DEFAULT_USER_SPOT_TRAVEL_MIN,
      habitats: [],
    }));
  }

  async addUserSpot(input: UserSpotInput): Promise<Spot> {
    const uid = await this.userId();
    if (!uid) throw new Error('Log ind for at tilføje et sted');
    const { data, error } = await this.db
      .from('spots')
      .insert({
        name: input.name,
        region: input.region?.trim() || null,
        source: 'user',
        owner_id: uid,
        habitats: [],
        // Samme WKT-mønster som finds.geom — geography_in() accepterer et rent tekstpunkt.
        geom: `POINT(${input.lon} ${input.lat})`,
      })
      .select('id, name, region, lat, lon')
      .single();
    if (error) throw error;
    return {
      id: data.id, name: data.name, region: data.region ?? 'Eget sted',
      lat: data.lat, lon: data.lon, travelMin: DEFAULT_USER_SPOT_TRAVEL_MIN, habitats: [],
    };
  }
}

/* ------------------------------------------------------------------ */

let repo: Repo | null = null;

/** Vælg adapter én gang: Supabase hvis konfigureret, ellers session. */
export function getRepo(): Repo {
  if (!repo) repo = getSupabase() ? new SupabaseRepo() : new SessionRepo();
  return repo;
}
