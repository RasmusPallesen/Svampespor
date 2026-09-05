/**
 * Modstandsdygtighed i vejrhentningen — se openMeteo.ts for hvorfor.
 *
 * Dækker det, der faktisk gik galt i produktion: én fejlende gittercelle
 * (typisk Open-Meteos 429) må ALDRIG kunne slå hele appen over i demodata,
 * når resten af cellerne svarer fint. Retries og `Promise.allSettled` er
 * begge nødvendige for det — testes hver for sig.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchForSpots } from './openMeteo';

function fakeOpenMeteoBody() {
  return {
    daily: {
      time: ['2026-08-25'],
      precipitation_sum: [1.2],
      temperature_2m_max: [18],
      temperature_2m_min: [10],
    },
    hourly: {
      time: ['2026-08-25T12:00'],
      relative_humidity_2m: [80],
      soil_moisture_0_to_7cm: [0.2],
    },
  };
}

const ok = () => ({ ok: true, status: 200, json: async () => fakeOpenMeteoBody() }) as Response;
const fail = (status = 429) => ({ ok: false, status, json: async () => ({}) }) as Response;

describe('fetchForSpots', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('falder kun tilbage til simuleret vejr for spots i den celle, der reelt fejler', async () => {
    // To spots langt fra hinanden = to forskellige gittefelter. Den ene
    // fejler vedvarende (alle 3 forsøg), den anden svarer med det samme.
    const fetchMock = vi.fn((url: string) => {
      const failing = url.includes('latitude=56'); // spot B's breddegrad
      return Promise.resolve(failing ? fail() : ok());
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchForSpots([
      { id: 'a', lat: 55.8, lon: 12.4 },
      { id: 'b', lat: 56.1, lon: 12.1 },
    ]);
    // 3 forsøg for den fejlende celle, backoff 500ms + 1000ms imellem.
    await vi.advanceTimersByTimeAsync(2000);
    const { weather, liveCells, totalCells } = await promise;

    expect(totalCells).toBe(2);
    expect(liveCells).toBe(1);
    expect(weather.a.days[0].precip).toBe(1.2); // rigtig data fra mock
    expect(weather.b).toBeDefined(); // simuleret, ikke undefined eller kastet fejl
    expect(weather.b.days.length).toBeGreaterThan(0);
  });

  it('bruger det andet eller tredje forsøg, hvis det først fejler (transient 429)', async () => {
    let calls = 0;
    const fetchMock = vi.fn(() => {
      calls++;
      return Promise.resolve(calls < 2 ? fail() : ok());
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchForSpots([{ id: 'a', lat: 55.8, lon: 12.4 }]);
    await vi.advanceTimersByTimeAsync(1000);
    const { weather, liveCells } = await promise;

    expect(liveCells).toBe(1); // lykkedes til sidst, talt som live, ikke simuleret
    expect(calls).toBe(2);
    expect(weather.a.days[0].precip).toBe(1.2);
  });
});
