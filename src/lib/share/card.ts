/**
 * Tegner delekortet (1080×1350) på et canvas.
 *
 * Fotoet fylder toppen, vejret fortæller historien nederst, og en
 * miniregnstribe gentager signaturelementet. Sløring styres af profilen:
 * er `blur` slået til, skrives "~2 km fra", aldrig koordinater.
 */

import type { WeatherSeries } from '../weather/model';
import type { FindRecord, Profile } from '../data/types';
import type { PlatformKey } from '../../data/catalog';

const W = 1080;
const H = 1350;

export async function drawCard(
  canvas: HTMLCanvasElement,
  find: FindRecord,
  platform: PlatformKey,
  profile: Profile,
  weather?: WeatherSeries,
): Promise<Blob | null> {
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext('2d');
  if (!x) return null;

  try { await document.fonts.ready; } catch { /* fonts er valgfrie */ }

  x.fillStyle = '#14170F';
  x.fillRect(0, 0, W, H);

  // foto
  if (find.photos?.length) {
    await new Promise<void>((res) => {
      const im = new Image();
      im.onload = () => {
        const s = Math.max(W / im.width, 900 / im.height);
        const w = im.width * s;
        const h = im.height * s;
        x.drawImage(im, (W - w) / 2, 0, w, h);
        res();
      };
      im.onerror = () => res();
      im.src = find.photos![0];
    });
  } else {
    const g = x.createLinearGradient(0, 0, W, 900);
    g.addColorStop(0, '#242B1D');
    g.addColorStop(1, '#1C2116');
    x.fillStyle = g;
    x.fillRect(0, 0, W, 900);
  }

  // gradient ned mod teksten
  const fade = x.createLinearGradient(0, 470, 0, 980);
  fade.addColorStop(0, 'rgba(20,23,15,0)');
  fade.addColorStop(1, '#14170F');
  x.fillStyle = fade;
  x.fillRect(0, 470, W, 510);

  // artsnavn
  x.fillStyle = '#EAE7DA';
  x.textAlign = 'left';
  x.font = '500 74px Fraunces, Georgia, serif';
  x.fillText(find.species.length > 24 ? `${find.species.slice(0, 23)}…` : find.species, 72, 950);

  // sted
  x.fillStyle = '#9FB58C';
  x.font = '500 27px "IBM Plex Mono", monospace';
  x.fillText((profile.prefs.blur ? '~2 KM FRA ' : '') + find.spotName.toUpperCase(), 74, 1000);

  // vejrdata — historien
  if (profile.prefs.weather) {
    const s = find.snapshot;
    x.strokeStyle = '#333C29';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(72, 1062);
    x.lineTo(W - 72, 1062);
    x.stroke();

    const cells: [string, string, string][] = [
      [`${s.daysSince} DAGE`, 'EFTER REGN', '#E3A73C'],
      [`${s.rain14} MM`, '14 DAGE', '#6DA9C9'],
      [`${s.rh}%`, 'LUFTFUGT', '#6DA9C9'],
      [`${s.tmax}°`, 'TEMPERATUR', '#EAE7DA'],
    ];
    cells.forEach((c, i) => {
      const cx = 76 + i * 236;
      x.fillStyle = c[2];
      x.font = '600 42px "IBM Plex Mono", monospace';
      x.fillText(c[0], cx, 1132);
      x.fillStyle = '#7C8A6E';
      x.font = '400 20px "IBM Plex Mono", monospace';
      x.fillText(c[1], cx, 1168);
    });

    // miniregnstribe
    if (weather) {
      const bars = weather.days.slice(0, 15);
      const maxP = Math.max(6, ...bars.map((d) => d.precip));
      bars.forEach((d, i) => {
        const bh = Math.max(3, (d.precip / maxP) * 54);
        x.fillStyle = d.precip >= 5 ? '#6DA9C9' : '#3E7A96';
        x.fillRect(76 + i * 62, 1268 - bh, 34, bh);
      });
    }
  }

  // afsender
  x.textAlign = 'right';
  x.fillStyle = '#7C8A6E';
  x.font = '400 24px "IBM Plex Mono", monospace';
  const handle = profile.handles[platform];
  x.fillText((handle ? `${handle}  ·  ` : '') + 'SVAMPESPOR', W - 72, 1280);

  return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.92));
}
