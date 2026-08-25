/** Resultatet af en billedbestemmelse. Spejler Edge Function'ens JSON-svar. */

export type Quality = 'god' | 'brugbar' | 'utilstraekkelig';
export type Severity = 'doedelig' | 'giftig' | 'uspiselig';

export interface Candidate {
  name_da: string;
  name_lat: string;
  confidence: number;
  reasoning: string;
  key_features: string[];
  ripening_window: [number, number];
  rain_mm: number;
}

export interface Lookalike {
  name_da: string;
  name_lat: string;
  severity: Severity;
  how_to_tell: string;
}

export interface IdResult {
  quality: Quality;
  quality_note: string;
  candidates: Candidate[];
  lookalikes: Lookalike[];
  missing_evidence: string[];
}

/** Ét skaleret billede — data-URL til visning, base64 til analysen. */
export interface Shot {
  url: string;
  b64: string;
}

export interface IdentifyInput {
  images: string[];
  habitat: string;
  observations: string;
  /** billedernes rækkefølge, fx ["Hatten ovenfra", "Undersiden …"] */
  order: string[];
}
