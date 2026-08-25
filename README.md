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
src/lib/data/                datalag: repo-interface + session- og Supabase-adapter
src/lib/id/                  artsbestemmelse: kald til Edge Function + billedskalering
src/lib/share/              delekort (canvas) + billedtekst
src/data/catalog.ts          systemsteder + arter (klientens spejl af databasen)
src/state/AppContext.tsx     appens tilstand ét sted
src/components/, src/views/  React-UI, bygget efter prototypen
supabase/functions/bestem/   Edge Function: artsbestemmelse (Anthropic-nøgle serverside)
supabase/functions/billedtekst/  Edge Function: billedtekst til deling
supabase/migrations/         skema, RLS, sløringstrigger
docs/model.md                hvorfor modellen ser sådan ud
docs/roadmap.md              hvad der mangler
docs/prototype.html          enkeltfil-demo af hele flowet (reference, ikke kodebase)
```

Appen kører fuldt ud uden backend: mangler Supabase-nøglerne, henter den stadig live
vejr fra Open-Meteo, holder fund i en session-adapter (aldrig localStorage) og viser
en pæn fejl, hvis bestemmelsesmotoren ikke er udrullet. Sæt `.env` op for at koble
fund, profil og artsbestemmelse på Supabase.

### Edge Functions

Artsbestemmelse og billedtekst går gennem Supabase Edge Functions, så Anthropic-nøglen
aldrig rammer frontend-bundlen (se `CLAUDE.md`, regel 1).

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy bestem
supabase functions deploy billedtekst
```

Al domænelogik i `src/lib/` er ren og testbar — ingen DOM, ingen fetch. Det er bevidst:
modellen er projektets egentlige værdi, og den skal kunne verificeres uden en browser.

### Auth (Google/Apple + magic-link)

Login går gennem Supabase Auth. Koden understøtter Google, Apple og e-mail magic-link
(`src/lib/auth/auth.ts`) — men selve udbyderne skal aktiveres i Supabase Dashboard, det
kan ikke gøres fra kommandolinjen eller af en assistent, da det kræver en OAuth-klient
og en hemmelighed fra udbyderens eget dashboard.

**Uanset udbyder** — under **Authentication → URL Configuration** i Supabase Dashboard,
tilføj din lokale og fremtidige produktions-URL til **Redirect URLs**:

```
http://localhost:5173
https://dit-domæne.dk
```

Uden det fejler både OAuth-redirect og magic-link-e-mails med en URL-mismatch-fejl.

**Google** (gratis, ingen betalt konto):
1. Opret et projekt i [Google Cloud Console](https://console.cloud.google.com), og en
   OAuth-klient under **APIs & Services → Credentials** (type: Web application).
2. Authorized redirect URI: `https://<dit-projekt-ref>.supabase.co/auth/v1/callback`.
3. I Supabase Dashboard: **Authentication → Providers → Google** — sæt Client ID og
   Client Secret fra Google Cloud Console, og slå provideren til.

**Apple** kræver et betalt Apple Developer-medlemskab (99 USD/år) samt en Services ID,
en genereret privat nøgle og domæneverificering i Apple's eget dashboard — se
[Supabase's Apple-guide](https://supabase.com/docs/guides/auth/social-login/auth-apple).
Koden er klar (samme `authWithApple()`-kald som Google), men kan først bruges, når
provideren er aktiveret i Supabase Dashboard.

**Magic-link** kræver ingen ekstern opsætning — virker med det samme, så længe
redirect-URL'en ovenfor er sat.

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
