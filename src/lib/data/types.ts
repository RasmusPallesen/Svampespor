/**
 * Domænetyper for datalaget.
 *
 * `FindRecord` er appens fund — rigere end rangeringens `Find`, som kun
 * behøver sted, art og dato. Vejrsnapshottet er med vilje kopieret ind på
 * findetidspunktet: det er dét, der gør datasættet værdifuldt over år.
 */

import type { GeoPoint } from '../geo/geolocation';
import type { Lookalike } from '../id/types';

export type IdSource = 'user' | 'ai' | 'community';

/**
 * Forslag til en ny "fællesskabsart" — Tier 2, se docs/roadmap.md.
 *
 * Bestem foreslår selv `window`/`rainMm`/`lookalikes` for enhver art, den
 * identificerer, uanset om arten allerede er en hånd-verificeret kerneart.
 * Er den ikke det, gemmes forslaget som en uverificeret species-række i
 * stedet for at gå tabt — det er hele mekanismen bag Tier 2. Sikkerheds-
 * reglerne (CLAUDE.md regel 1-2) kommer stadig fra ID_PROMPT ved hvert
 * kald, ikke fra denne gemte tilstand.
 */
export interface SpeciesProposal {
  nameDa: string;
  nameLat: string;
  window: [number, number];
  rainMm: number;
  lookalikes: Lookalike[];
}

/** Vejret som det så ud, da fundet blev gjort. Fryses fast, opdateres aldrig. */
export interface WeatherSnapshot {
  /** mm nedbør over de 14 dage før fundet */
  rain14: number;
  /** dage siden seneste regnhændelse */
  daysSince: number;
  /** luftfugtighed, % */
  rh: number;
  /** middel af tmax, °C */
  tmax: number;
}

export interface FindRecord {
  id: string;
  species: string;
  speciesLat?: string;
  habitat: string;
  quantity: string;
  spotId: string;
  spotName: string;
  note: string;
  /** ISO-dato, YYYY-MM-DD */
  date: string;
  snapshot: WeatherSnapshot;
  /** billeder som data-URL'er (session) eller storage-stier (Supabase) */
  photos?: string[];
  source: IdSource;
  /** AI-sikkerhedsgrad 0-100, kun når source === 'ai' */
  confidence?: number;
  shared: boolean;
  /**
   * Præcis position, kun sat når brugeren eksplicit slog positionslogning
   * til (CLAUDE.md regel 3). Vises kun for ejeren — RLS'et `finds`-tabel
   * afleder automatisk en sløret ~1-2 km version til fællesskabslaget,
   * aldrig denne selv.
   */
  geo?: GeoPoint | null;
}

/** Det, der skal til for at oprette et fund — resten udfylder datalaget. */
export interface FindInput {
  species: string;
  speciesLat?: string;
  habitat: string;
  quantity: string;
  spotId: string;
  spotName: string;
  note: string;
  date: string;
  snapshot: WeatherSnapshot;
  photos?: string[];
  source: IdSource;
  confidence?: number;
  geo?: GeoPoint | null;
}

export interface ProfilePrefs {
  /** skjul den præcise plet i delekortet */
  blur: boolean;
  /** vis vejrdata på delekortet */
  weather: boolean;
  /** foreslå en billedtekst */
  caption: boolean;
}

export interface Profile {
  displayName: string;
  handles: Record<string, string>;
  prefs: ProfilePrefs;
}

/** Ét fund i fællesskabsfeedet — allerede sløret, aldrig med præcis position. */
export interface FeedItem {
  who: string;
  when: string;
  species: string;
  location: string;
  tags: { kind: '' | 'ver' | 'pend'; text: string }[];
  avatar: string;
}
