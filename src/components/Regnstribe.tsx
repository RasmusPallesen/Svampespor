import { useMemo } from 'react';

import { lastRainEvent, RAIN_EVENT_MM, type Species, type WeatherSeries } from '../lib/weather/model';
import './Regnstribe.css';

/* Danske ugedage/datoer via Intl — aldrig håndlavede forkortelser. */
const weekdayFmt = new Intl.DateTimeFormat('da-DK', { weekday: 'short' });
const dateFmt = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short' });
const noon = (iso: string) => new Date(`${iso}T12:00:00`);

/** Højden på den højeste søjle i px — resten skaleres mod denne. */
const STRIP_PX = 82;

interface RegnstribeProps {
  /** Vejrserie: 14 observerede dage + i dag + prognose. */
  w: WeatherSeries;
  /** Arten, hvis modningsvindue tegnes som gyldent bånd. */
  sp: Species;
  /** Stednavn til panel-labelen. */
  spotName: string;
}

interface BarModel {
  key: string;
  /** Søjlehøjde i px. */
  height: number;
  /** Er dagen en prognose (efter i dag)? */
  forecast: boolean;
  /** Regnhændelse ≥5 mm, målt (ikke prognose)? */
  event: boolean;
  today: boolean;
  /** Faldende opacitet for prognosedage, ellers undefined. */
  dim?: number;
  label: string;
  tip: string;
}

/**
 * Regnstriben — 21 dages nedbør med modningsvinduet bagved.
 *
 * Ren visning af `model.ts`: hændelsen findes med `lastRainEvent`, og båndet
 * spænder artens `window` dage efter den. Ingen fetch, ingen egen model.
 */
export function Regnstribe({ w, sp, spotName }: RegnstribeProps) {
  const { days, todayIdx } = w;

  const bars = useMemo<BarModel[]>(() => {
    const maxP = Math.max(6, ...days.map((d) => d.precip));
    return days.map((d, i) => {
      const dt = noon(d.date);
      const forecast = i > todayIdx;
      const event = !forecast && d.precip >= RAIN_EVENT_MM;
      const label = i === todayIdx ? 'i dag' : i % 3 === 0 ? String(dt.getDate()) : '';
      const tip = `${weekdayFmt.format(dt)} ${dateFmt.format(dt)} · ${d.precip.toFixed(1)} mm${
        forecast ? ' · prognose' : ''
      }`;
      return {
        key: d.date,
        height: Math.max(2, (d.precip / maxP) * STRIP_PX),
        forecast,
        event,
        today: i === todayIdx,
        dim: forecast ? Math.max(0.32, 1 - (i - todayIdx) * 0.11) : undefined,
        label,
        tip,
      };
    });
  }, [days, todayIdx]);

  /* Modningsvinduet: fra hændelsen + window[0] til + window[1], i procent. */
  const band = useMemo(() => {
    const evIdx = lastRainEvent(days, todayIdx);
    if (evIdx < 0) return null;
    const from = evIdx + sp.window[0];
    const to = Math.min(days.length - 1, evIdx + sp.window[1]);
    if (to < from) return null;
    return {
      left: (from / days.length) * 100,
      width: ((to - from + 1) / days.length) * 100,
    };
  }, [days, todayIdx, sp.window]);

  return (
    <section className="regnstribe panel">
      <div className="panel-label">
        <span>Regnstriben — {spotName}</span>
        <span>21 dage</span>
      </div>

      <div className="strip-wrap">
        <div className="strip">
          {band && (
            <div className="ripen-band" style={{ left: `${band.left}%`, width: `${band.width}%` }}>
              <div className="ripen-tag">modningsvindue</div>
            </div>
          )}
          {bars.map((b) => (
            <div key={b.key} className={`bar-col${b.today ? ' today' : ''}`}>
              <div className="tip">{b.tip}</div>
              <div
                className={`bar${b.forecast ? ' fc' : ''}${b.event ? ' big' : ''}`}
                style={{ height: `${b.height}px`, opacity: b.dim }}
              />
              <div className="bar-lbl">{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="strip-legend">
        <div className="leg">
          <i style={{ background: 'var(--rain)' }} /> hændelse ≥5 mm
        </div>
        <div className="leg">
          <i style={{ background: 'var(--rain-deep)' }} /> målt nedbør
        </div>
        <div className="leg">
          <i style={{ border: '1px dashed rgba(109,169,201,.6)' }} /> prognose
        </div>
        <div className="leg">
          <i style={{ background: 'rgba(227,167,60,.35)' }} /> modningsvindue
        </div>
      </div>
    </section>
  );
}
