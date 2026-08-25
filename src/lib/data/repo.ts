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

import { SEED_FEED, seedFinds } from './seed';
import { getSupabase } from './supabaseClient';
import type { FeedItem, FindInput, FindRecord, Profile } from './types';

export interface Repo {
  /** Er dette laget, der rent faktisk persisterer? */
  readonly persistent: boolean;
  listFinds(): Promise<FindRecord[]>;
  addFind(input: FindInput): Promise<FindRecord>;
  setShared(id: string, shared: boolean): Promise<void>;
  getProfile(): Promise<Profile | null>;
  saveProfile(profile: Profile | null): Promise<void>;
  listFeed(): Promise<FeedItem[]>;
}

/* ------------------------------------------------------------------ */
/* Session — hukommelse                                                */
/* ------------------------------------------------------------------ */

class SessionRepo implements Repo {
  readonly persistent = false;
  private finds: FindRecord[] = seedFinds();
  private profile: Profile | null = null;
  private seq = 0;

  async listFinds() {
    return [...this.finds];
  }

  async addFind(input: FindInput) {
    const rec: FindRecord = { ...input, id: `local-${++this.seq}`, shared: false };
    this.finds = [rec, ...this.finds];
    return rec;
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
class SupabaseRepo implements Repo {
  readonly persistent = true;
  constructor(private readonly db = getSupabase()!) {}

  private async userId(): Promise<string | null> {
    const { data } = await this.db.auth.getUser();
    return data.user?.id ?? null;
  }

  async listFinds(): Promise<FindRecord[]> {
    const { data, error } = await this.db
      .from('finds')
      .select('id, species_text, habitat, quantity, spot_id, found_at, note, weather, id_source, id_confidence, shared')
      .order('found_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r): FindRecord => ({
      id: r.id,
      species: r.species_text ?? 'Ukendt',
      habitat: r.habitat ?? '',
      quantity: r.quantity != null ? String(r.quantity) : '1',
      spotId: r.spot_id ?? '',
      spotName: r.weather?.spotName ?? '',
      note: r.note ?? '',
      date: r.found_at,
      snapshot: r.weather?.snapshot ?? { rain14: 0, daysSince: 0, rh: 0, tmax: 0 },
      source: r.id_source,
      confidence: r.id_confidence ?? undefined,
      shared: r.shared,
    }));
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
        quantity: Number(input.quantity) || null,
        spot_id: input.spotId,
        found_at: input.date,
        note: input.note,
        weather: { snapshot: input.snapshot, spotName: input.spotName },
        id_source: input.source,
        id_confidence: input.confidence ?? null,
        shared: false,
      })
      .select('id')
      .single();
    if (error) throw error;
    return { ...input, id: data.id, shared: false };
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
}

/* ------------------------------------------------------------------ */

let repo: Repo | null = null;

/** Vælg adapter én gang: Supabase hvis konfigureret, ellers session. */
export function getRepo(): Repo {
  if (!repo) repo = getSupabase() ? new SupabaseRepo() : new SessionRepo();
  return repo;
}
