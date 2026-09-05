# Roadmap

## Fase 1 — fundament
- [x] Modningsindeks med prognoseusikkerhed, testet
- [x] Rangering af steder, testet
- [x] Databaseskema med RLS og automatisk sløring
- [x] React-skal med alle fire faner + profil, bygget efter prototypen
- [x] Regnstriben som React-komponent
- [x] Feltdagbog: opret og læs fund med vejrsnapshot (datalag med session- + Supabase-adapter)
- [x] Artsbestemmelse i UI + Edge Function `bestem` (nøglen serverside)
- [x] Supabase-projekt oprettet (`svampespor`, eu-central-1), migrationer kørt, systemsteder + arter seedet med faste UUID'er
- [x] Edge Functions `bestem` og `billedtekst` udrullet — mangler kun `ANTHROPIC_API_KEY` som secret for at være aktive
- [x] Auth-kode klar: Google, Apple og e-mail magic-link (`src/lib/auth/`), profiler kobles til `auth.uid()` — Google/Apple skal aktiveres i Supabase Dashboard af projektejeren, se README → Auth
- [x] Nøjagtig positionslogning ved fund — opt-in switch, `finds.geom` + genererede `lat`/`lon`-kolonner, blurres automatisk til fællesskabslaget (regel 3)
- [x] Rediger og slet fund — voksested/jordtype/antal/note, og vigtigst: tilføj et billede EFTER fundet er gemt (sporeaftryk tager 2-12 timer at fremkalde, sjældent klar ved selve loggen). Art/kilde kan bevidst ikke ændres — det er en større handling end at rette et par felter. Fotos ligger midlertidigt som data-URL'er direkte på rækken (nyt `photos`-felt), ikke i den endnu ubyggede Storage-pipeline

## Fase 2 — felten
- [x] "Voksested" i log/bestem splittet i to felter: Voksested (biom/træ) og Jordtype (muldbund/morbund/kalkrig/sandet/mose/ved ikke), sourcet fra samme jordbundsviden som docs/spots.md. Sendes nu også med til Bestems AI-prompt og delingens billedtekst
- [ ] Kort med steder og egne nåle (MapLibre + PostGIS) — positionsdata findes nu på fund, mangler kortvisning
- [ ] Hemmelige nåle med klientside-kryptering
- [ ] Billedupload til Supabase Storage, tre slots (i dag: data-URL'er i session)
- [x] Artsbestemmelse via Edge Function (nøglen aldrig i frontend)
- [x] Offline-kø: log fund uden dækning, synk senere — `addFind` lægger fundet i IndexedDB, når skrivningen fejler på en netværksmåde (ikke ved rigtige fejl som forkert login eller RLS), og synker automatisk ved næste `online`-event eller app-start. Se `src/lib/data/offlineQueue.ts`
- [x] Rettet: appen viste sommetider "Demodata" selvom det meste af vejret reelt var hentet — `fetchForSpots` brugte `Promise.all`, så ét fejlende gitterfelt (oftest Open-Meteos 429, mere sandsynligt efter kataloget voksede til 15 spredte steder) slog HELE appen over i simuleret vejr. Nu er hver celle uafhængig (`allSettled` + 3 forsøg med backoff), og kun de spots i netop den fejlende celle falder tilbage — "Live" betyder nu "mindst ét gitterfelt lykkedes", ikke "alle". Se `src/lib/weather/openMeteo.ts` og dens testfil.
- [ ] DMI Open Data ved siden af Open-Meteo
- [ ] Rigtig server-side vejrcache i `weather_cells` (tabellen findes, bruges ikke endnu) — den egentlige fix for at undgå at ramme Open-Meteos rate-limit overhovedet, ikke kun at overleve den pænt

## Fase 3 — fællesskab
- [x] Tier 2: fællesskabsarter. Bestem gemmer nu sit eget forslag til modningsvindue + forvekslinger som en uverificeret art i `species`-tabellen, hvis den ikke allerede er en kerneart — løser "kun 7 arter" uden at gætte de øvrige ~3000 danske arters data i forvejen. Vises i Log et fund, tydeligt mærket "AI, ikke verificeret"; indgår bevidst ikke i Jager/rangering, som forudsætter data, en enkelt AI-vurdering ikke giver. Se docs/species.md.
- [x] Søgbar, grupperet artsvælger i Log et fund (`SpeciesPicker`) — en flad dropdown holder til 7 kernearter, ikke til et Tier 2-katalog, der vokser med hver ny AI-identifikation. Grupperer i Kernearter/Fællesskabsarter, filtrerer på dansk eller latinsk navn. Jager-vælgeren i Jagten er bevidst uændret (almindelig `<select>`) — den er for altid begrænset til kernearter
- [ ] Feed over slørede fund
- [ ] Følg andre samlere
- [ ] Crowd-verificering af svære bestemmelser — den naturlige forfremmelsesvej for fællesskabsarter: nok uafhængige bekræftelser (eller en hånd-research-tur som kernearternes) flytter en art fra Tier 2 til Tier 1
- [ ] Sæsonudfordringer
- [ ] Delekort som canvas-billede + Web Share API

## Fase 4 — det der gør den til din
- [x] Systemsteders `habitats` udvidet med rigtig jordbund (kalkrig/sandet/mose) og fuld trævariation pr. sted, sourcet enkeltvis hos Naturstyrelsen — se docs/spots.md. Fem nye velkendte, offentligt tilgængelige sjællandske svampesteder tilføjet (Teglstrup Hegn, Gurre Vang, Bidstrup Skovene, Sorø Sønderskov, Faksinge Skov), 10 → 15 i alt
- [x] Voksested/Jordtype i log/bestem forudfyldes nu ud fra det aktive steds egne `habitats` (`suggestHabitat`/`suggestSoil` i catalog.ts) — data fra linjen ovenfor bruges nu faktisk et sted, i stedet for at stå ubrugt bag rangeringens habitatFactor
- [x] Sæsondata pr. art hentet fra Svampeatlas, dokumenteret i `docs/species.md` — se dér for det vigtigste fund: modellen har ingen kalenderspærre endnu
- [x] `season` koblet ind i `scoreFor` som en gaussisk dæmpende faktor (`seasonFactor`, 0,15-1) uden for kernesæsonen — 7 nye tests, verificeret med rigtige vejrdata (Østershat 17 vs. Kantarel 51, samme dag/sted, 31/8-2026)
- [ ] Kalibrering af regnbaserede modningsvinduer (`window`, `rainMm`) mod Svampeatlas — kræver reel fund-vs-vejr-korrelation, ikke kun fænologitekst
- [ ] Rigtig frost-trigger til østershat (kalendersæson er en tilnærmelse, ikke det samme som at måle frost)
- [ ] Personlige mønstre: dine egne fund mod vejret
- [ ] Notifikation når vinduet åbner på et fastgjort sted
- [ ] Artspecifik temperaturrespons

## Åbne spørgsmål
- Målgruppe: kun dig, det danske fællesskab, eller bredere?
- Vil folk overhovedet dele fund, når de frygter at afsløre pletter?
  "Skjul præcis plet" er slået til som standard, men det er en antagelse værd at teste.
- Skal fællesskabet være åbent eller inviteret? Tillid er hele produktet her.
