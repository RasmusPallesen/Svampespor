/**
 * Demovejr — stabil pr. lokation, plausibel sensommer på Sjælland.
 *
 * Kun en fallback, når Open-Meteo ikke kan nås (offline, blokeret sandkasse).
 * Ren funktion, ingen I/O — samme frø giver samme serie hver gang.
 */

import type { WeatherSeries } from '../lib/weather/model';

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function simulateWeather(lat: number, lon: number, today = new Date()): WeatherSeries {
  const rnd = seeded(Math.round((lat + lon) * 10000));
  const start = new Date(today);
  start.setDate(start.getDate() - 14);

  // en rigtig regnhændelse for 5-9 dage siden, plus lidt drys
  const eventDay = 14 - Math.floor(4 + rnd() * 5);
  const days = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    let precip = rnd() < 0.58 ? 0 : +(rnd() * 3.4).toFixed(1);
    if (i === eventDay) precip = +(9 + rnd() * 13).toFixed(1);
    if (i === eventDay + 1) precip = +(2 + rnd() * 7).toFixed(1);
    if (i === 17) precip = +(rnd() * 6).toFixed(1);
    const near = Math.max(0, 1 - Math.abs(i - eventDay) / 6);
    return {
      date: d.toISOString().slice(0, 10),
      precip,
      tmax: +(16 + rnd() * 7).toFixed(1),
      tmin: +(9 + rnd() * 4).toFixed(1),
      rh: +(68 + near * 20 + rnd() * 8).toFixed(0),
      soil: +(0.17 + near * 0.16 + rnd() * 0.05).toFixed(3),
    };
  });

  return { days, todayIdx: 14 };
}
