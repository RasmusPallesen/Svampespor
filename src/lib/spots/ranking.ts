/**
 * Rangering af steder.
 *
 *   score = indeks × afstand × historik + nyhed − mætning
 *
 * Historikfaktoren er det, der gør appen din frem for en vejrtjeneste.
 * Ren funktion — vejrdata og fund kommer ind som argumenter.
 */

import {
  read, project, leadConfidence, RAIN_EVENT_MM,
  type WeatherSeries, type Species, type Reading, type Confidence,
} from '../weather/model';

export interface Spot {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  /** rejsetid i minutter fra brugerens base — ikke luftlinje */
  travelMin: number;
  habitats: string[];
}

export type Relation = 'pinned' | 'followed' | 'hidden';

export interface Find {
  spotId: string;
  species: string;
  /** ISO-dato */
  date: string;
}

export const MAX_PINNED = 5;

/**
 * Rejsetid → faktor. 20 min ≈ 0,98 · 60 min ≈ 0,63 · 120 min ≈ 0,24.
 *
 * Blødt aftagende, aldrig klippet flad: en tur på halvanden time og en tur
 * til Jylland skal ikke veje ens. De første 15 minutter er gratis — under
 * det opleves afstand ikke som en omkostning.
 */
export function distanceFactor(travelMin: number): number {
  const t = Math.max(0, travelMin - 15);
  return Math.exp(-Math.pow(t / 80, 1.35));
}

/** Uden historik afgør voksestedet — sådan undgår appen at være tom den første uge. */
export function habitatFactor(spot: Spot, sp: Species): number {
  if (!sp.habitats.length) return 1;
  const hits = spot.habitats.filter((h) => sp.habitats.includes(h)).length;
  return 1 + Math.min(0.28, hits * 0.11);
}

export function historyFactor(spot: Spot, sp: Species, finds: Find[]) {
  const here = finds.filter((f) => f.spotId === spot.id);
  if (!here.length) return { factor: habitatFactor(spot, sp), reason: null, coldStart: true };
  const same = here.filter((f) => f.species === sp.nameDa).length;
  const other = here.length - same;
  return {
    factor: Math.min(1.55, 1 + same * 0.14 + other * 0.05),
    reason: same ? `${same} tidligere fund` : `${here.length} fund i alt`,
    coldStart: false,
  };
}

/** Var du der lige? Så er stedet tømt, uanset hvad vejret siger. */
export function saturationPenalty(spot: Spot, finds: Find[], today: Date) {
  const days = finds
    .filter((f) => f.spotId === spot.id)
    .map((f) => (today.getTime() - new Date(`${f.date}T12:00:00Z`).getTime()) / 864e5)
    .sort((a, b) => a - b);
  const last = days[0];
  if (last === undefined || last > 8) return { penalty: 0, daysAgo: null };
  return { penalty: Math.round(26 * (1 - last / 8)), daysAgo: Math.round(last) };
}

export type ReasonTone = 'neutral' | 'good' | 'history' | 'bad';
export interface Reason { tone: ReasonTone; text: string }

export interface Forward {
  tone: 'flat' | 'rising' | 'peak';
  text: string;
  /** null når linjen ikke citerer et prognosetal */
  projected: { lo: number; hi: number; showRange: boolean } | null;
  confidence: Confidence;
}

const DAYS_FULL = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const plural = (n: number) => (n === 1 ? 'dag' : 'dage');

/**
 * Hvad gør stedet i morgen? Et sted uden for vinduet skal kunne forklare sig
 * selv, ikke bare stå der med en høj score.
 */
export function forward(w: WeatherSeries, r: Reading, sp: Species): Forward {
  const { days, todayIdx } = w;
  const dayName = (i: number) => DAYS_FULL[new Date(`${days[i].date}T12:00:00Z`).getUTCDay()];

  let nextRain = -1;
  for (let i = todayIdx + 1; i < days.length; i++) {
    if (days[i].precip >= RAIN_EVENT_MM) { nextRain = i; break; }
  }

  const ds = r.daysSince;
  const [lo, hi] = sp.window;
  const asRange = (p: ReturnType<typeof project>) =>
    ({ lo: p.lo, hi: p.hi, showRange: p.lead > 0 && p.spread >= 6 });

  if (ds !== null && ds < lo) {
    const d = lo - ds;
    // Arter med et bredt vindue (høj lo, fx tragtkantarel) kan pege længere
    // frem end prognosen rækker. Klemmer til sidste kendte dag i stedet for
    // at indeksere ud af days — samme "tilliden falder med afstanden"-idé
    // som project() allerede bruger til selve lead-tabellen.
    const targetIdx = Math.min(todayIdx + d, days.length - 1);
    const p = project(targetIdx, days, todayIdx, sp);
    return { tone: 'rising', text: `rykker ind i vinduet om ${d} ${plural(d)}`,
             projected: asRange(p), confidence: p.confidence };
  }

  if (ds !== null && ds >= lo && ds <= hi && r.best.idx > todayIdx) {
    const p = project(r.best.idx, days, todayIdx, sp);
    return { tone: 'peak', text: `topper ${dayName(r.best.idx)}`,
             projected: asRange(p), confidence: p.confidence };
  }

  if (ds !== null && ds >= lo && ds <= hi) {
    const left = hi - ds;
    return { tone: 'peak', projected: null, confidence: 'målt',
             text: left === 0 ? 'sidste dag i vinduet' : `vinduet lukker om ${left} ${plural(left)}` };
  }

  if (ds !== null && ds > hi) {
    if (nextRain >= 0) {
      return { tone: 'rising', projected: null, confidence: leadConfidence(nextRain - todayIdx),
               text: `regn ${dayName(nextRain)} · nyt vindue om ${nextRain + lo - todayIdx} dage` };
    }
    return { tone: 'flat', projected: null, confidence: 'målt',
             text: `vinduet lukkede for ${ds - hi} ${plural(ds - hi)} siden` };
  }

  if (nextRain >= 0) {
    return { tone: 'rising', projected: null, confidence: leadConfidence(nextRain - todayIdx),
             text: `regn ${dayName(nextRain)} · vindue om ${nextRain + lo - todayIdx} dage` };
  }
  return { tone: 'flat', text: 'venter på regn', projected: null, confidence: 'målt' };
}

export interface RankedSpot {
  spot: Spot;
  score: number;
  baseScore: number;
  reading: Reading;
  reasons: Reason[];
  forward: Forward;
  relation: Relation | null;
}

export function rankSpots(args: {
  spots: Spot[];
  weather: Record<string, WeatherSeries>;
  species: Species;
  finds: Find[];
  relations: Record<string, Relation>;
  today: Date;
  includeHidden?: boolean;
}): RankedSpot[] {
  const { spots, weather, species: sp, finds, relations, today, includeHidden = false } = args;
  const out: RankedSpot[] = [];

  for (const spot of spots) {
    const relation = relations[spot.id] ?? null;
    if (relation === 'hidden' && !includeHidden) continue;
    const w = weather[spot.id];
    if (!w) continue;

    const r = read(w, sp);
    const dist = distanceFactor(spot.travelMin);
    const hist = historyFactor(spot, sp, finds);
    const sat = saturationPenalty(spot, finds, today);
    const novelty = finds.some((f) => f.spotId === spot.id) ? 0 : 6;

    const score = Math.max(0, Math.round(r.score * dist * hist.factor + novelty - sat.penalty));

    const reasons: Reason[] = [];
    const [lo, hi] = sp.window;
    if (r.daysSince !== null && r.daysSince >= lo && r.daysSince <= hi) {
      reasons.push({ tone: 'good', text: `dag ${r.daysSince} i vinduet` });
    } else if (r.daysSince !== null) {
      reasons.push({ tone: 'neutral', text: `dag ${r.daysSince} efter regn` });
    }
    reasons.push({ tone: 'neutral', text: `${spot.travelMin} min` });
    if (hist.reason) reasons.push({ tone: 'history', text: hist.reason });
    else if (hist.factor > 1.05) reasons.push({ tone: 'neutral', text: 'voksested passer' });
    if (novelty) reasons.push({ tone: 'neutral', text: 'aldrig besøgt' });
    if (sat.penalty) reasons.push({ tone: 'bad', text: `du var her for ${sat.daysAgo} d siden` });

    out.push({ spot, score, baseScore: r.score, reading: r, reasons,
               forward: forward(w, r, sp), relation });
  }

  return out.sort((a, b) => b.score - a.score);
}
