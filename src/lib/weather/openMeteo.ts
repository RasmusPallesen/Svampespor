/**
 * Open-Meteo-klient. Gratis, ingen API-nøgle, arkiv tilbage til 1940.
 * Bruger selv DMI's HARMONIE-model til danske prognoser.
 *
 * Fase 2: DMI Open Data (opendataapi.dmi.dk) ved siden af, for rigtige
 * stationsmålinger. Kræver gratis nøgle via GovCloud-portalen.
 */

import { simulateWeather } from '../../data/demoWeather';
import type { DayWeather, WeatherSeries } from './model';

const BASE = 'https://api.open-meteo.com/v1/forecast';

/**
 * Snap koordinater til et ~2 km gitter.
 *
 * Naboskove deler celle, så kaldmængden falder fra hundredvis til en
 * håndfuld pr. dag — og cellen er nøglen i `weather_cells`-tabellen.
 * 0,02° bredde ≈ 2,2 km; længdegraden korrigeres for breddegraden.
 */
export function gridCell(lat: number, lon: number): string {
  const latStep = 0.02;
  const lonStep = 0.02 / Math.cos((lat * Math.PI) / 180);
  const la = Math.round(lat / latStep) * latStep;
  const lo = Math.round(lon / lonStep) * lonStep;
  return `${la.toFixed(3)},${lo.toFixed(3)}`;
}

export function cellCenter(cell: string): { lat: number; lon: number } {
  const [lat, lon] = cell.split(',').map(Number);
  return { lat, lon };
}

interface OpenMeteoResponse {
  daily: {
    time: string[];
    precipitation_sum: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
  };
  hourly: {
    time: string[];
    relative_humidity_2m: (number | null)[];
    soil_moisture_0_to_7cm: (number | null)[];
  };
}

const avg = (xs: (number | null)[]): number | null => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export function parse(j: OpenMeteoResponse, todayIso: string): WeatherSeries {
  // Forindekser timerne pr. dato, så vi ikke scanner hele arrayet pr. døgn
  const byDate = new Map<string, number[]>();
  j.hourly.time.forEach((t, i) => {
    const d = t.slice(0, 10);
    const arr = byDate.get(d);
    if (arr) arr.push(i);
    else byDate.set(d, [i]);
  });

  const days: DayWeather[] = j.daily.time.map((date, i) => {
    const idx = byDate.get(date) ?? [];
    return {
      date,
      precip: j.daily.precipitation_sum[i] ?? 0,
      tmax: j.daily.temperature_2m_max[i] ?? 0,
      tmin: j.daily.temperature_2m_min[i] ?? 0,
      rh: avg(idx.map((h) => j.hourly.relative_humidity_2m[h])),
      soil: avg(idx.map((h) => j.hourly.soil_moisture_0_to_7cm[h])),
    };
  });

  let todayIdx = days.findIndex((d) => d.date === todayIso);
  if (todayIdx < 0) todayIdx = Math.min(14, days.length - 1);
  return { days, todayIdx };
}

export interface FetchOpts {
  pastDays?: number;
  forecastDays?: number;
  signal?: AbortSignal;
}

/** Hent 14 observerede dage + i dag + prognose for en gittercelle. */
export async function fetchCell(cell: string, opts: FetchOpts = {}): Promise<WeatherSeries> {
  const { pastDays = 14, forecastDays = 7, signal } = opts;
  const { lat, lon } = cellCenter(cell);

  const url =
    `${BASE}?latitude=${lat}&longitude=${lon}` +
    `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min` +
    `&hourly=relative_humidity_2m,soil_moisture_0_to_7cm` +
    `&past_days=${pastDays}&forecast_days=${forecastDays}` +
    `&timezone=Europe%2FCopenhagen`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open-Meteo svarede ${res.status}`);
  const todayIso = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Copenhagen' });
  return parse((await res.json()) as OpenMeteoResponse, todayIso);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Samme kald som `fetchCell`, men prøver igen på en fejl i stedet for at
 * give op med det samme. Et enkelt 429/timeout på ét gitterfelt skal ikke
 * kunne slå hele appen over i demodata — se `fetchForSpots`.
 */
async function fetchCellResilient(cell: string, opts: FetchOpts, attempts = 3): Promise<WeatherSeries> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchCell(cell, opts);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(500 * 2 ** i); // 500 ms, 1000 ms
    }
  }
  throw lastErr;
}

export interface SpotWeatherResult {
  weather: Record<string, WeatherSeries>;
  /** Antal gittefelter der reelt fik svar fra Open-Meteo, mod det samlede antal. */
  liveCells: number;
  totalCells: number;
}

/**
 * Hent flere steder på én gang, med deduplikering på gittercelle.
 *
 * Hver celle hentes uafhængigt (`allSettled`, ikke `all`) — falder ét felt
 * (typisk 429 fra Open-Meteos rate-limit, som blev mere sandsynlig, da
 * kataloget voksede fra 10 til 15 spredte steder), simuleres KUN de
 * spot-id'er, der sad i netop den celle. Resten beholder rigtige data i
 * stedet for at hele appen falder tilbage til demodata på grund af ét
 * fjernt sted, ingen lige nu kigger på.
 */
export async function fetchForSpots(
  spots: { id: string; lat: number; lon: number }[],
  opts: FetchOpts = {},
): Promise<SpotWeatherResult> {
  const cells = new Map<string, string[]>();
  for (const s of spots) {
    const c = gridCell(s.lat, s.lon);
    const ids = cells.get(c);
    if (ids) ids.push(s.id);
    else cells.set(c, [s.id]);
  }

  const entries = [...cells];
  const settled = await Promise.allSettled(entries.map(([cell]) => fetchCellResilient(cell, opts)));

  const out: Record<string, WeatherSeries> = {};
  let liveCells = 0;
  settled.forEach((result, i) => {
    const [cell, ids] = entries[i];
    if (result.status === 'fulfilled') {
      liveCells++;
      for (const id of ids) out[id] = result.value;
    } else {
      console.error(`Open-Meteo fejlede for celle ${cell}, bruger simuleret vejr for ${ids.length} sted(er):`, result.reason);
      const { lat, lon } = cellCenter(cell);
      const sim = simulateWeather(lat, lon);
      for (const id of ids) out[id] = sim;
    }
  });

  return { weather: out, liveCells, totalCells: entries.length };
}
