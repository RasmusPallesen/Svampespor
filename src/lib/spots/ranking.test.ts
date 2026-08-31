import { describe, it, expect } from 'vitest';
import {
  rankSpots, forward, distanceFactor, habitatFactor, historyFactor, saturationPenalty,
  type Spot, type Find, type Relation,
} from './ranking';
import { read, type DayWeather, type Species, type WeatherSeries } from '../weather/model';

const KANTAREL: Species = {
  nameDa: 'Kantarel', nameLat: 'Cantharellus cibarius',
  window: [5, 9], rainMm: 14, habitats: ['bøg', 'mos', 'løv', 'sur'],
};

const TODAY = new Date('2026-08-25T09:00:00Z');

function series(eventDay: number | null, mm = 16): WeatherSeries {
  const days: DayWeather[] = [];
  for (let i = 0; i < 21; i++) {
    const d = new Date(Date.UTC(2026, 7, 11));
    d.setUTCDate(d.getUTCDate() + i);
    days.push({
      date: d.toISOString().slice(0, 10),
      precip: eventDay !== null && i === eventDay ? mm : 0,
      tmax: 16, tmin: 9, rh: 86, soil: 0.28,
    });
  }
  return { days, todayIdx: 14 };
}

const spot = (id: string, travelMin: number, habitats = ['bøg', 'mos']): Spot =>
  ({ id, name: id, region: 'Sjælland', lat: 55.8, lon: 12.4, travelMin, habitats });

describe('distanceFactor', () => {
  it('falder monotont med rejsetiden', () => {
    const xs = [10, 20, 40, 60, 90, 120].map(distanceFactor);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeLessThan(xs[i - 1]);
  });

  it('bliver ved med at skelne, også langt ude', () => {
    // Tidligere fejl: faktoren var klippet flad ved ~85 min, så en tur på
    // halvanden time og en tur til Jylland vejede præcis ens.
    expect(distanceFactor(240)).toBeLessThan(distanceFactor(120));
    expect(distanceFactor(240)).toBeGreaterThan(0);
  });

  it('gør de første kvarter gratis', () => {
    expect(distanceFactor(5)).toBeCloseTo(1, 2);
    expect(distanceFactor(20)).toBeGreaterThan(0.9);
  });
});

describe('habitatFactor', () => {
  it('belønner voksesteder arten faktisk søger', () => {
    expect(habitatFactor(spot('a', 20, ['bøg', 'mos', 'sur']), KANTAREL))
      .toBeGreaterThan(habitatFactor(spot('b', 20, ['græs']), KANTAREL));
  });

  it('er neutral uden match', () => {
    expect(habitatFactor(spot('b', 20, ['græs']), KANTAREL)).toBe(1);
  });
});

describe('historyFactor', () => {
  const s = spot('gribskov', 30);

  it('falder tilbage på voksested når du aldrig har været der', () => {
    const h = historyFactor(s, KANTAREL, []);
    expect(h.coldStart).toBe(true);
    expect(h.reason).toBeNull();
  });

  it('vægter fund af samme art tungest', () => {
    const same = historyFactor(s, KANTAREL,
      [{ spotId: 'gribskov', species: 'Kantarel', date: '2025-09-01' }]);
    const other = historyFactor(s, KANTAREL,
      [{ spotId: 'gribskov', species: 'Østershat', date: '2025-09-01' }]);
    expect(same.factor).toBeGreaterThan(other.factor);
  });

  it('har loft, så ét sted ikke kan dominere for evigt', () => {
    const many: Find[] = Array.from({ length: 40 }, (_, i) =>
      ({ spotId: 'gribskov', species: 'Kantarel', date: `2025-09-${String((i % 28) + 1).padStart(2, '0')}` }));
    expect(historyFactor(s, KANTAREL, many).factor).toBeLessThanOrEqual(1.55);
  });
});

describe('saturationPenalty', () => {
  it('straffer et sted du netop har tømt', () => {
    const r = saturationPenalty(spot('a', 20),
      [{ spotId: 'a', species: 'Kantarel', date: '2026-08-24' }], TODAY);
    expect(r.penalty).toBeGreaterThan(0);
    expect(r.daysAgo).toBe(1);
  });

  it('slipper straffen efter otte dage', () => {
    const r = saturationPenalty(spot('a', 20),
      [{ spotId: 'a', species: 'Kantarel', date: '2026-08-01' }], TODAY);
    expect(r.penalty).toBe(0);
  });
});

describe('forward', () => {
  it('klemmer til sidste kendte dag i stedet for at indeksere ud af prognosen', () => {
    // Fandt live: tragtkantarel har lo=7. Falder regnen på selve "i dag"
    // (daysSince=0), peger todayIdx + (lo-0) = 21 ud over en 21-dages serie
    // (gyldige indeks 0-20) — det crashede appen, indtil forward() klemte
    // måltallet til days.length-1.
    const wideWindow: Species = { ...KANTAREL, nameDa: 'Tragtkantarel', window: [7, 13] };
    const w = series(14); // regn falder på "i dag" (indeks 14 = todayIdx)
    const r = read(w, wideWindow);
    expect(r.daysSince).toBe(0);
    expect(() => forward(w, r, wideWindow)).not.toThrow();
  });
});

describe('rankSpots', () => {
  const spots = [spot('naer', 20), spot('fjern', 90)];
  const weather = { naer: series(7), fjern: series(7) };
  const base = { spots, weather, species: KANTAREL, finds: [] as Find[],
                 relations: {} as Record<string, Relation>, today: TODAY };

  it('foretrækker det nære sted ved ellers ens vejr', () => {
    const r = rankSpots(base);
    expect(r[0].spot.id).toBe('naer');
  });

  it('skjuler fravalgte steder som standard', () => {
    const r = rankSpots({ ...base, relations: { fjern: 'hidden' } });
    expect(r.map((x) => x.spot.id)).not.toContain('fjern');
  });

  it('kan tage de fravalgte med, når man beder om det', () => {
    const r = rankSpots({ ...base, relations: { fjern: 'hidden' }, includeHidden: true });
    expect(r.map((x) => x.spot.id)).toContain('fjern');
  });

  it('lader historik løfte et fjernere sted over et nært uden historik', () => {
    const finds: Find[] = Array.from({ length: 4 }, (_, i) =>
      ({ spotId: 'fjern', species: 'Kantarel', date: `2025-09-0${i + 1}` }));
    const r = rankSpots({ ...base, spots: [spot('naer', 45), spot('fjern', 55)], finds });
    expect(r[0].spot.id).toBe('fjern');
  });

  it('giver hver række en begrundelse og en fremskrivning', () => {
    for (const row of rankSpots(base)) {
      expect(row.reasons.length).toBeGreaterThan(0);
      expect(row.forward.text).toBeTruthy();
      expect(row.forward.confidence).toBeTruthy();
    }
  });

  it('sorterer faldende', () => {
    const r = rankSpots(base);
    for (let i = 1; i < r.length; i++) expect(r[i].score).toBeLessThanOrEqual(r[i - 1].score);
  });

  it('ændrer rangeringen når du skifter art — vinduet flytter sig', () => {
    const TRAGT: Species = { ...KANTAREL, nameDa: 'Tragtkantarel', window: [7, 13], habitats: ['gran'] };
    const w = { tidlig: series(9), sen: series(3) };
    const ss = [spot('tidlig', 30), spot('sen', 30)];
    const a = rankSpots({ ...base, spots: ss, weather: w, species: KANTAREL });
    const b = rankSpots({ ...base, spots: ss, weather: w, species: TRAGT });
    expect(a[0].spot.id).not.toBe(b[0].spot.id);
  });
});
