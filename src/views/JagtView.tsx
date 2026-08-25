import { useMemo } from 'react';

import { findSpot } from '../data/catalog';
import { fmtWeekday, cap } from '../lib/format';
import { band, read, type Reading, type WeatherSeries } from '../lib/weather/model';
import { BAND_COLOR, Dial } from '../components/Dial';
import { Regnstribe } from '../components/Regnstribe';
import { SpotPanel } from '../components/SpotPanel';
import { useApp } from '../state/AppContext';

export function JagtView() {
  const { weather, weatherReady, activeSpotId, targetSpecies } = useApp();
  const spot = findSpot(activeSpotId);
  const w = weather[activeSpotId];

  const reading = useMemo(() => (w ? read(w, targetSpecies) : null), [w, targetSpecies]);

  if (!spot || !w || !reading) {
    return <div className="loading">{weatherReady ? 'INTET VEJR FOR STEDET' : 'LÆSER SKOVBUNDEN…'}</div>;
  }

  const b = band(reading.score);

  return (
    <>
      <div className="panel">
        <div className="readout">
          <Dial score={reading.score} color={BAND_COLOR[b.key]} />
          <div className="verdict">
            <h2 style={{ color: BAND_COLOR[b.key] }}>{b.label}</h2>
            <p dangerouslySetInnerHTML={{ __html: rainLine(reading) }} />
          </div>
        </div>

        <div className="metrics">
          <Metric value={reading.rain14.toFixed(0)} unit="mm / 14 d" cls="rain-c" />
          <Metric value={reading.daysSince?.toString() ?? '–'} unit="dage siden regn" cls="gold-c" />
          <Metric value={`${reading.rh3.toFixed(0)}%`} unit="luftfugt" />
          <Metric value={`${reading.tmax5.toFixed(0)}°`} unit="middel max" />
        </div>

        <BestDay reading={reading} w={w} />
      </div>

      <Regnstribe w={w} sp={targetSpecies} spotName={spot.name} />

      <SpotPanel />
    </>
  );
}

function Metric({ value, unit, cls }: { value: string; unit: string; cls?: string }) {
  return (
    <div className="metric">
      <b className={cls}>{value}</b>
      <span>{unit}</span>
    </div>
  );
}

function BestDay({ reading, w }: { reading: Reading; w: WeatherSeries }) {
  const { best } = reading;
  const wide = best.lead > 0 && best.spread >= 6;
  const num = wide ? `${best.lo}–${best.hi}` : best.mid;

  let title: string;
  let body: string;
  if (best.idx === w.todayIdx) {
    title = 'I dag er den bedste dag i vinduet';
    body = 'Indekset falder igen fra i overmorgen, medmindre der kommer ny regn.';
  } else {
    title = `${cap(fmtWeekday(w.days[best.idx].date))} ser bedst ud`;
    body = wide
      ? `Prognosen peger på ${best.lo}–${best.hi} afhængigt af, hvor meget regn der faktisk falder.`
      : `Prognosen løfter indekset til ${best.mid}.`;
    if (best.lead >= 5) body += ' Så langt frem er nedbøren et gæt — tjek igen om et par dage.';
    else if (best.lead >= 3) body += ' Nedbørsmængden kan stadig flytte sig.';
  }

  return (
    <div className="bestday">
      <div className="num" style={wide ? { fontSize: 19 } : undefined}>{num}</div>
      <div className="txt"><b>{title}</b>{body}</div>
    </div>
  );
}

function rainLine(r: Reading): string {
  if (r.daysSince === null) {
    return 'Ingen betydelig regn i de sidste 14 dage. Myceliet venter.';
  }
  const dage = r.daysSince === 1 ? 'dag' : 'dage';
  return (
    `Det regnede <b>${r.eventRain.toFixed(0)} mm</b> for <b>${r.daysSince} ${dage}</b> siden. ` +
    `${r.species.nameDa} bryder typisk frem ${r.species.window[0]}-${r.species.window[1]} dage efter.`
  );
}
