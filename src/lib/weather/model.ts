/**
 * Modningsindeks — kernen i Svampespor.
 *
 * Ren funktion af vejrdata og art. Ingen I/O, ingen DOM.
 * Ændrer du vægte her, skal model.test.ts opdateres bevidst.
 */

export interface DayWeather {
  /** ISO-dato, YYYY-MM-DD */
  date: string;
  /** mm nedbør i døgnet */
  precip: number;
  tmax: number;
  tmin: number;
  /** relativ luftfugtighed i %, døgnmiddel */
  rh: number | null;
  /** volumetrisk jordfugt 0-7 cm, m³/m³ */
  soil: number | null;
}

export interface WeatherSeries {
  /** 14 observerede dage + i dag + prognose */
  days: DayWeather[];
  /** indeks i days[] for i dag */
  todayIdx: number;
}

export interface Species {
  nameDa: string;
  nameLat: string;
  /** [tidligst, senest] dage efter regnhændelse hvor arten typisk bryder frem */
  window: [number, number];
  /** nedbørsmængde arten typisk kræver i hændelsen, mm */
  rainMm: number;
  /** voksesteder arten søger — bruges til cold start i rangeringen */
  habitats: string[];
}

/** En regnhændelse tæller fra denne døgnmængde */
export const RAIN_EVENT_MM = 5;

/* ------------------------------------------------------------------ */
/* Indeks                                                              */
/* ------------------------------------------------------------------ */

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/** Seneste døgn på eller før idx med nedbør ≥ RAIN_EVENT_MM. -1 hvis ingen. */
export function lastRainEvent(days: DayWeather[], idx: number): number {
  for (let i = idx; i >= 0; i--) if (days[i].precip >= RAIN_EVENT_MM) return i;
  return -1;
}

/**
 * Indeks 0-100 for en given dag. Fem komponenter:
 *   42  position i artens modningsvindue (gaussisk om optimum)
 *   24  nedbørsmængde i hændelsen, målt mod artens behov
 *   15  luftfugtighed seneste tre døgn
 *   12  temperatur, optimum ~14 °C
 *    7  jordfugt i topjorden
 */
export function scoreFor(idx: number, days: DayWeather[], sp: Species): number {
  const past = days.slice(0, idx + 1);
  const evIdx = lastRainEvent(days, idx);
  if (evIdx < 0) return 8; // uden regn er der intet at modne

  const since = idx - evIdx;
  const evRain = days
    .slice(evIdx, Math.min(evIdx + 3, days.length))
    .reduce((a, d) => a + d.precip, 0);

  const [lo, hi] = sp.window;
  const mid = (lo + hi) / 2;
  const wid = (hi - lo) / 2 + 1.2;
  const windowScore = 42 * Math.exp(-((since - mid) ** 2) / (2 * wid * wid));

  const rainScore = 24 * clamp(evRain / sp.rainMm);

  const rh = mean(past.slice(-3).map((d) => d.rh ?? 70));
  const rhScore = 15 * clamp((rh - 62) / 28);

  const t = mean(past.slice(-5).map((d) => d.tmax));
  const tScore = 12 * Math.exp(-((t - 14) ** 2) / (2 * 5.5 * 5.5));

  const soil = mean(past.slice(-2).map((d) => d.soil ?? 0.2));
  const soilScore = 7 * clamp((soil - 0.15) / 0.2);

  return Math.round(clamp(windowScore + rainScore + rhScore + tScore + soilScore, 0, 100));
}

/* ------------------------------------------------------------------ */
/* Prognoseusikkerhed                                                  */
/* ------------------------------------------------------------------ */

/**
 * En nedbørsprognose er rimelig to døgn frem og bliver hurtigt løs derefter.
 * Pr. lead-tid: [tørt scenarie, vådt scenarie, tillid].
 */
const LEAD: ReadonlyArray<readonly [number, number, number]> = [
  [1.0, 1.0, 1.0],
  [0.85, 1.15, 1.0],
  [0.7, 1.32, 0.97],
  [0.55, 1.52, 0.92],
  [0.42, 1.78, 0.85],
  [0.3, 2.05, 0.76],
  [0.2, 2.3, 0.68],
  [0.14, 2.55, 0.6],
];

export type Confidence = 'målt' | 'sikker' | 'usikker' | 'løs prognose';

export const leadConfidence = (lead: number): Confidence =>
  lead <= 0 ? 'målt' : lead <= 2 ? 'sikker' : lead <= 4 ? 'usikker' : 'løs prognose';

export interface Projection {
  mid: number;
  lo: number;
  hi: number;
  lead: number;
  /** tillidsvægt 0-1, brugt når dage sammenlignes indbyrdes */
  trust: number;
  /** mid × trust — det tal dage skal rangeres på */
  weighted: number;
  confidence: Confidence;
  spread: number;
}

/**
 * Indeks for en fremtidig dag, som interval.
 *
 * Spændet fremkommer ved at køre modellen to gange med prognosens nedbør
 * skaleret ned og op — ikke ved at lægge tilfældig støj oveni. Det afspejler
 * den faktiske fejlkilde. Bemærk konsekvensen: er den drivende regn allerede
 * faldet, er spændet næsten nul, fordi vinduet så er et observeret faktum.
 */
export function project(
  idx: number,
  days: DayWeather[],
  todayIdx: number,
  sp: Species,
): Projection {
  const lead = idx - todayIdx;
  const mid = scoreFor(idx, days, sp);

  if (lead <= 0) {
    return { mid, lo: mid, hi: mid, lead: 0, trust: 1, weighted: mid, confidence: 'målt', spread: 0 };
  }

  const [dry, wet, trust] = LEAD[Math.min(lead, LEAD.length - 1)];
  const scale = (f: number) =>
    days.map((d, i) => (i > todayIdx ? { ...d, precip: d.precip * f } : d));

  let lo = Math.min(scoreFor(idx, scale(dry), sp), mid);
  let hi = Math.max(scoreFor(idx, scale(wet), sp), mid);

  // Selv når regnen er faldet, er luftfugtighed og temperatur stadig prognose.
  const floor = Math.round((1 - trust) * mid * 0.6);
  lo = Math.max(0, Math.min(lo, mid - floor));
  hi = Math.min(100, Math.max(hi, mid + floor));

  return {
    mid, lo, hi, lead, trust,
    weighted: mid * trust,
    confidence: leadConfidence(lead),
    spread: hi - lo,
  };
}

/* ------------------------------------------------------------------ */
/* Samlet aflæsning af et sted                                         */
/* ------------------------------------------------------------------ */

export interface Reading {
  score: number;
  /** dage siden seneste regnhændelse, null hvis ingen i perioden */
  daysSince: number | null;
  eventIdx: number;
  eventRain: number;
  rain14: number;
  rh3: number;
  tmax5: number;
  soil2: number;
  best: Projection & { idx: number };
  species: Species;
}

export function read(w: WeatherSeries, sp: Species): Reading {
  const { days, todayIdx } = w;
  const past = days.slice(0, todayIdx + 1);

  const eventIdx = lastRainEvent(days, todayIdx);
  const daysSince = eventIdx >= 0 ? todayIdx - eventIdx : null;
  const eventRain =
    eventIdx >= 0
      ? days.slice(eventIdx, Math.min(eventIdx + 3, days.length)).reduce((a, d) => a + d.precip, 0)
      : 0;

  const score = scoreFor(todayIdx, days, sp);

  // Bedste dag frem — vægtet med tilliden, så et løst dag-6-tal ikke
  // slår et solidt dag-2-tal.
  let best = { ...project(todayIdx, days, todayIdx, sp), idx: todayIdx };
  for (let i = todayIdx + 1; i < days.length; i++) {
    const p = project(i, days, todayIdx, sp);
    if (p.weighted > best.weighted) best = { ...p, idx: i };
  }

  return {
    score, daysSince, eventIdx, eventRain,
    rain14: past.slice(-14).reduce((a, d) => a + d.precip, 0),
    rh3: mean(past.slice(-3).map((d) => d.rh ?? 70)),
    tmax5: mean(past.slice(-5).map((d) => d.tmax)),
    soil2: mean(past.slice(-2).map((d) => d.soil ?? 0.2)),
    best, species: sp,
  };
}

export type Band = { label: string; key: 'open' | 'ok' | 'soon' | 'dry' };

export function band(score: number): Band {
  if (score >= 72) return { label: 'Modningsvinduet er åbent', key: 'open' };
  if (score >= 52) return { label: 'Værd at gå en tur', key: 'ok' };
  if (score >= 32) return { label: 'Tidligt endnu', key: 'soon' };
  return { label: 'Skovbunden er tør', key: 'dry' };
}
