import { describe, it, expect } from 'vitest';
import {
  scoreFor, project, read, band, lastRainEvent,
  type DayWeather, type Species, type WeatherSeries,
} from './model';

const KANTAREL: Species = {
  nameDa: 'Kantarel', nameLat: 'Cantharellus cibarius',
  window: [5, 9], rainMm: 14, habitats: ['bøg', 'mos', 'løv', 'sur'],
};
const TRAGT: Species = {
  nameDa: 'Tragtkantarel', nameLat: 'Craterellus tubaeformis',
  window: [7, 13], rainMm: 16, habitats: ['gran', 'mos', 'sur', 'fyr'],
};

/** Byg en serie: 14 observerede dage + i dag + `fc` prognosedage. */
function series(opts: {
  eventDay?: number; eventMm?: number; rh?: number; tmax?: number;
  soil?: number; fc?: number; fcRainDay?: number; fcRainMm?: number;
}): WeatherSeries {
  const { eventDay, eventMm = 16, rh = 85, tmax = 16, soil = 0.28,
          fc = 6, fcRainDay, fcRainMm = 12 } = opts;
  const days: DayWeather[] = [];
  for (let i = 0; i < 15 + fc; i++) {
    const d = new Date(Date.UTC(2026, 7, 11));
    d.setUTCDate(d.getUTCDate() + i);
    let precip = 0;
    if (eventDay !== undefined && i === eventDay) precip = eventMm;
    if (fcRainDay !== undefined && i === fcRainDay) precip = fcRainMm;
    days.push({ date: d.toISOString().slice(0, 10), precip, tmax, tmin: tmax - 7, rh, soil });
  }
  return { days, todayIdx: 14 };
}

describe('lastRainEvent', () => {
  it('finder seneste døgn med mindst 5 mm', () => {
    const w = series({ eventDay: 8 });
    expect(lastRainEvent(w.days, w.todayIdx)).toBe(8);
  });

  it('ignorerer drys under tærsklen', () => {
    const w = series({ eventDay: 8 });
    w.days[12].precip = 3.4;
    expect(lastRainEvent(w.days, w.todayIdx)).toBe(8);
  });

  it('giver -1 når der ingen hændelse er', () => {
    expect(lastRainEvent(series({}).days, 14)).toBe(-1);
  });
});

describe('scoreFor', () => {
  it('topper midt i artens vindue', () => {
    // kantarel: vindue 5-9, optimum 7 → hændelse på dag 7 giver dag 7 i dag
    const inWindow = scoreFor(14, series({ eventDay: 7 }).days, KANTAREL);
    const tooEarly = scoreFor(14, series({ eventDay: 12 }).days, KANTAREL);
    const tooLate  = scoreFor(14, series({ eventDay: 0 }).days, KANTAREL);
    expect(inWindow).toBeGreaterThan(tooEarly);
    expect(inWindow).toBeGreaterThan(tooLate);
  });

  it('er lav uden regn', () => {
    expect(scoreFor(14, series({}).days, KANTAREL)).toBeLessThan(15);
  });

  it('belønner større regnmængde i hændelsen', () => {
    const lidt = scoreFor(14, series({ eventDay: 7, eventMm: 6 }).days, KANTAREL);
    const meget = scoreFor(14, series({ eventDay: 7, eventMm: 25 }).days, KANTAREL);
    expect(meget).toBeGreaterThan(lidt);
  });

  it('straffer tør luft', () => {
    const fugtig = scoreFor(14, series({ eventDay: 7, rh: 92 }).days, KANTAREL);
    const tør = scoreFor(14, series({ eventDay: 7, rh: 60 }).days, KANTAREL);
    expect(fugtig).toBeGreaterThan(tør);
  });

  it('straffer temperaturer langt fra optimum', () => {
    const godt = scoreFor(14, series({ eventDay: 7, tmax: 14 }).days, KANTAREL);
    const koldt = scoreFor(14, series({ eventDay: 7, tmax: 2 }).days, KANTAREL);
    expect(godt).toBeGreaterThan(koldt);
  });

  it('rangerer arter forskelligt på samme vejr — det er hele pointen', () => {
    // 12 dage siden regn: for sent til kantarel (5-9), midt i for tragtkantarel (7-13)
    const w = series({ eventDay: 2 });
    expect(scoreFor(14, w.days, TRAGT)).toBeGreaterThan(scoreFor(14, w.days, KANTAREL));
  });

  it('holder sig inden for 0-100', () => {
    for (const ev of [0, 3, 7, 11, 14]) {
      const s = scoreFor(14, series({ eventDay: ev, eventMm: 90, rh: 100, soil: 0.9 }).days, KANTAREL);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe('project — prognoseusikkerhed', () => {
  const w = series({ eventDay: 10, fcRainDay: 18 });

  it('har intet spænd på i dag, fordi det er målt', () => {
    const p = project(14, w.days, 14, KANTAREL);
    expect(p.spread).toBe(0);
    expect(p.confidence).toBe('målt');
  });

  it('lader spændet vokse med lead-tiden', () => {
    // Ikke strengt monotont skridt for skridt: usikkerhedsgulvet skalerer med
    // selve scoren, og scoren falder, efterhånden som vinduet lukker. Et lille
    // fald mellem to nabodage er derfor korrekt opførsel, ikke en fejl.
    const s = (l: number) => project(14 + l, w.days, 14, KANTAREL).spread;
    expect(s(3)).toBeGreaterThan(s(1));
    expect(s(6)).toBeGreaterThan(s(3));
  });

  it('lader tilliden falde med lead-tiden', () => {
    const t = [1, 3, 6].map((l) => project(14 + l, w.days, 14, KANTAREL).trust);
    expect(t[0]).toBeGreaterThan(t[1]);
    expect(t[1]).toBeGreaterThan(t[2]);
  });

  it('holder midt inden for spændet', () => {
    for (let l = 0; l <= 6; l++) {
      const p = project(14 + l, w.days, 14, KANTAREL);
      expect(p.mid).toBeGreaterThanOrEqual(p.lo);
      expect(p.mid).toBeLessThanOrEqual(p.hi);
    }
  });

  it('mærker lange prognoser som løse', () => {
    expect(project(15, w.days, 14, KANTAREL).confidence).toBe('sikker');
    expect(project(18, w.days, 14, KANTAREL).confidence).toBe('usikker');
    expect(project(20, w.days, 14, KANTAREL).confidence).toBe('løs prognose');
  });
});

describe('read', () => {
  it('regner dage siden regn korrekt', () => {
    const r = read(series({ eventDay: 8 }), KANTAREL);
    expect(r.daysSince).toBe(6);
  });

  it('giver null når ingen regn er faldet', () => {
    expect(read(series({}), KANTAREL).daysSince).toBeNull();
  });

  it('summerer nedbør over fjorten dage', () => {
    const r = read(series({ eventDay: 8, eventMm: 18 }), KANTAREL);
    expect(r.rain14).toBeCloseTo(18, 1);
  });

  it('lader ikke et løst dag-6-tal slå et solidt dag-2-tal', () => {
    // Regn faldt for 3 dage siden (dag 2 frem = dag 5 i vinduet),
    // og der ligger en stor prognoseregn langt ude.
    const w = series({ eventDay: 11, fcRainDay: 19, fcRainMm: 40 });
    const r = read(w, KANTAREL);
    expect(r.best.idx - w.todayIdx).toBeLessThanOrEqual(4);
  });

  it('peger på i dag når toppen er nu', () => {
    const r = read(series({ eventDay: 7 }), KANTAREL);
    expect(r.best.idx).toBe(14);
    expect(r.best.confidence).toBe('målt');
  });
});

describe('band', () => {
  it('deler skalaen i fire trin', () => {
    expect(band(85).key).toBe('open');
    expect(band(60).key).toBe('ok');
    expect(band(40).key).toBe('soon');
    expect(band(10).key).toBe('dry');
  });
});
