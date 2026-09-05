import { useMemo } from 'react';

import { fmtWeekday, cap, monthName } from '../lib/format';
import { band, read, seasonState, type Reading, type SeasonState, type WeatherSeries } from '../lib/weather/model';
import { BAND_COLOR, Dial } from '../components/Dial';
import { Regnstribe } from '../components/Regnstribe';
import { SpotPanel } from '../components/SpotPanel';
import { useApp } from '../state/AppContext';

export function JagtView() {
  const { weather, weatherReady, activeSpotId, targetSpecies, allSpots } = useApp();
  const spot = allSpots.find((s) => s.id === activeSpotId);
  const w = weather[activeSpotId];

  const reading = useMemo(() => (w ? read(w, targetSpecies) : null), [w, targetSpecies]);

  if (!spot || !w || !reading) {
    return <div className="loading">{weatherReady ? 'INTET VEJR FOR STEDET' : 'LÆSER SKOVBUNDEN…'}</div>;
  }

  const todayMonth = Number(w.days[w.todayIdx].date.slice(5, 7));
  const season = seasonState(todayMonth, targetSpecies.season);
  const b = band(reading.score, season);

  return (
    <>
      <div className="panel">
        <div className="readout">
          <Dial score={reading.score} color={BAND_COLOR[b.key]} />
          <div className="verdict">
            <h2 style={{ color: BAND_COLOR[b.key] }}>{b.label}</h2>
            <p dangerouslySetInnerHTML={{ __html: verdictText(reading, season) }} />
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

/** Måneds-spandet for en sæson, i "juni-oktober"-stil — arrayet er allerede i fruiting-rækkefølge. */
function seasonRange(months: number[]): string {
  return `${monthName(months[0])}-${monthName(months[months.length - 1])}`;
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

/**
 * Samme rainLine som før for arter i sæson — men uden for artens
 * dokumenterede sæson erstattes den af en sæsonforklaring, så et lavt
 * indeks ikke fejlagtigt læses som "tør skovbund, vent på regn". I
 * yderkanten (extended) beholdes rainLine, blot med en kort tilføjelse.
 */
function verdictText(r: Reading, state: SeasonState): string {
  const sp = r.species;
  if (state === 'outside' && sp.season) {
    return (
      `${sp.nameDa} har sæson <b>${seasonRange(sp.season.core)}</b> (Danmarks Svampeatlas). ` +
      `Det er ikke sæson lige nu, så indekset holder sig lavt — uanset hvor meget det regner.`
    );
  }
  const base = rainLine(r);
  if (state === 'extended' && sp.season) {
    return `${base} Du er i udkanten af sæsonen (${seasonRange(sp.season.extended)}) — stadig muligt, bare sjældnere.`;
  }
  return base;
}
