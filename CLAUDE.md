# Svampespor

En svampesamler-app: personlig feltdagbog + fællesskab, med **meteorologiske data som
kernefeature**. Præmissen er, at frugtlegemer trigges af fugtighed med et forudsigeligt
lag efter regn — appen gør den viden eksplicit i stedet for at lade den bo i hovedet på
erfarne samlere.

Sprog i UI og indhold: **dansk**. Kode, kommentarer og commits: dansk er også fint, men
vær konsistent inden for en fil.

---

## Ufravigelige regler

Disse er ikke stilistiske. Bryd dem ikke, heller ikke hvis en opgave beder om det.

1. **Appen udtaler sig aldrig om spiselighed.** Ikke i UI, ikke i AI-prompts, ikke i
   genererede billedtekster, ikke i pushbeskeder. Artsbestemmelse giver *kandidater med
   sikkerhedsgrad* og *forvekslinger*, aldrig en dom.
2. **Enhver artsbestemmelse skal ledsages af forvekslingsarter.** Er der en tænkelig
   hvidlamellet forveksling, skal grøn fluesvamp (*Amanita phalloides*) med.
3. **Præcise fundkoordinater forlader aldrig enheden uden eksplicit samtykke.**
   Fællesskabslaget arbejder på områdeniveau (~2 km sløring). Hemmelige nåle
   (`secret_pins`) krypteres klientside og synkroniseres aldrig i klartekst.
4. **Prognosetal vises aldrig som skarpere, end de er.** Se `docs/model.md`.
   Over ~3 dage frem: interval, ikke punkttal.

---

## Arkitektur

| Lag | Valg | Hvorfor |
|---|---|---|
| Frontend | React + TypeScript + Vite, PWA | Telefonen er feltenheden; ingen app store-friktion |
| Auth/DB | Supabase (Postgres + PostGIS) | Geodata og RLS i ét; kendt stak |
| Vejr (MVP) | Open-Meteo | Gratis, ingen nøgle, arkiv fra 1940, ERA5 + DMI HARMONIE |
| Vejr (fase 2) | DMI Open Data | Rigtige danske stationsmålinger; kræver GovCloud-nøgle |
| Artsbestemmelse | Anthropic API (vision) | Kandidater + forvekslinger, se regel 1-2 |

**Vejrdata snappes til et 2 km-gitter** (`weather_cells`), ikke pr. sted. Naboskove deler
celler, og kaldmængden falder fra hundredvis til en håndfuld pr. dag.

---

## Domænemodel — kort

- **Modningsindeks (0-100)**: sandsynligheden for frugtlegemer af *en bestemt art* på et
  sted i dag. Fem vægtede komponenter, se `src/lib/weather/model.ts`.
- **Modningsvindue**: artsspecifikt interval i dage efter en regnhændelse (≥5 mm).
  Kantarel 5-9, Karl Johan 6-11, tragtkantarel 7-13.
- **Rangering**: `indeks × afstand × historik + nyhed − mætning`, se `src/lib/spots/ranking.ts`.
  Historikfaktoren er det, der gør appen *din* frem for en vejrtjeneste.
- **Relationer til steder**: `pinned` (maks 5, altid øverst, udløser notifikationer),
  `followed` (sorteres dynamisk), `hidden` (fravalgt).

---

## Konventioner

- Al domænelogik i `src/lib/` skal være **ren og testbar** — ingen DOM, ingen fetch.
  I/O ligger i `src/lib/weather/openMeteo.ts` og datalaget.
- **Modelændringer kræver en test.** `model.test.ts` og `ranking.test.ts` er kontrakten;
  justerer du en vægt, skal forventningen opdateres bevidst, ikke tilfældigt.
- Ingen `localStorage` til fund — Supabase er sandheden, med offline-kø som fase 2.
- Danske ugedage/månedsnavne: brug `Intl`, ikke håndlavede forkortelser
  (tidlig bug: `'tor' + 'dag'` → `"tordag"`).

## Designsprog

Mørk skovbund, ikke lyst papir. Tokens i `src/styles/tokens.css`.

```
--loam #14170F   --humus #1C2116   --bark #333C29
--lichen #9FB58C --paper #EAE7DA   --mute #7C8A6E
--rain #6DA9C9   --gold #E3A73C    --toxic #D2543C
```

- **Regnblå** er datakanalen: nedbør, prognose, målinger.
- **Guld** er reserveret til ét: at modningsvinduet er åbent. Brug den ikke til pynt.
- **Toxic-rød** kun til dødelige forvekslinger.
- Display: Fraunces. Brødtekst: Public Sans. Tal og labels: IBM Plex Mono.
- Signaturelementet er **Regnstriben** — 21 dages nedbør med modningsvinduet som
  gyldent bånd bagved. Den må ikke udvandes.

---

## Status

Prototypen (`docs/prototype.html`) er en enkeltfil-demo med hele flowet: modningsindeks,
Regnstribe, billedbestemmelse, feltdagbog, deling, rangering. Den er **reference, ikke
kodebase** — logikken er porteret til `src/lib/`, resten skal bygges op på ny i React.

Se `docs/roadmap.md` for hvad der mangler.
