# Svampespor

Svampesamler-app med vejret som kernefeature: en personlig feltdagbog, artsbestemmelse
med indbygget sikkerhedslogik, og et fællesskabslag der ikke afslører nogens pletter.

Præmissen er, at frugtlegemer trigges af fugtighed med et forudsigeligt lag efter regn.
Svampespor gør den viden eksplicit i stedet for at lade den bo i hovedet på erfarne
samlere.

> **Appen udtaler sig aldrig om spiselighed.** Artsbestemmelse giver kandidater med
> sikkerhedsgrad og forvekslingsarter — aldrig en dom. Se `CLAUDE.md`.

---

## Kom i gang

```bash
npm install
cp .env.example .env      # udfyld Supabase-nøgler
npm test                  # 38 tests på domænelogikken
npm run dev
```

### Supabase

```bash
supabase start            # lokal stak med PostGIS
supabase db push          # kører supabase/migrations/
npm run db:types          # genererer src/types/database.ts
```

---

## Hvad ligger hvor

```
src/lib/weather/model.ts     modningsindeks + prognoseusikkerhed  (ren, testet)
src/lib/weather/openMeteo.ts vejr-I/O med 2 km gittersnapping
src/lib/spots/ranking.ts     rangering af steder                  (ren, testet)
supabase/migrations/         skema, RLS, sløringstrigger
docs/model.md                hvorfor modellen ser sådan ud
docs/roadmap.md              hvad der mangler
docs/prototype.html          enkeltfil-demo af hele flowet (reference, ikke kodebase)
```

Al domænelogik i `src/lib/` er ren og testbar — ingen DOM, ingen fetch. Det er bevidst:
modellen er projektets egentlige værdi, og den skal kunne verificeres uden en browser.

---

## Modellen kort

**Modningsindeks (0-100)** for en art på et sted i dag:

| Vægt | Komponent |
|---|---|
| 42 | position i artens modningsvindue (gaussisk om optimum) |
| 24 | nedbørsmængde i regnhændelsen, målt mod artens behov |
| 15 | luftfugtighed seneste tre døgn |
| 12 | temperatur, optimum ~14 °C |
| 7 | jordfugt i topjorden |

**Rangering** af steder: `indeks × afstand × historik + nyhed − mætning`.

**Prognoseusikkerhed**: over ~3 dage frem vises interval, ikke punkttal. Spændet
fremkommer ved at køre modellen med prognosens nedbør skaleret ned og op — ikke ved at
lægge støj oveni. Se `docs/model.md`.

---

## Første push til GitHub

```bash
git init -b main
git add .
git commit -m "Svampespor: modningsmodel, rangering og skema"

gh repo create svampespor --private --source=. --push
# eller manuelt:
# git remote add origin git@github.com:<bruger>/svampespor.git
# git push -u origin main
```

CI kører typecheck og tests på hver PR — se `.github/workflows/ci.yml`.

---

## Datakilder

- [Open-Meteo](https://open-meteo.com) — gratis, ingen nøgle, CC BY 4.0. Bruger DMI's
  HARMONIE-model til danske prognoser.
- [DMI Open Data](https://opendataapi.dmi.dk) — rigtige danske stationsmålinger.
  Gratis nøgle via GovCloud-portalen. Fase 2.
- [Svampeatlas](https://svampe.databasen.org) — til kalibrering af modningsvinduer mod
  virkelige danske fund.
