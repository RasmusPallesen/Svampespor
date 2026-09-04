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
- [ ] Rediger og slet fund

## Fase 2 — felten
- [x] "Voksested" i log/bestem splittet i to felter: Voksested (biom/træ) og Jordtype (muldbund/morbund/kalkrig/sandet/mose/ved ikke), sourcet fra samme jordbundsviden som docs/spots.md. Sendes nu også med til Bestems AI-prompt og delingens billedtekst
- [ ] Kort med steder og egne nåle (MapLibre + PostGIS) — positionsdata findes nu på fund, mangler kortvisning
- [ ] Hemmelige nåle med klientside-kryptering
- [ ] Billedupload til Supabase Storage, tre slots (i dag: data-URL'er i session)
- [x] Artsbestemmelse via Edge Function (nøglen aldrig i frontend)
- [ ] Offline-kø: log fund uden dækning, synk senere
- [ ] DMI Open Data ved siden af Open-Meteo

## Fase 3 — fællesskab
- [x] Tier 2: fællesskabsarter. Bestem gemmer nu sit eget forslag til modningsvindue + forvekslinger som en uverificeret art i `species`-tabellen, hvis den ikke allerede er en kerneart — løser "kun 7 arter" uden at gætte de øvrige ~3000 danske arters data i forvejen. Vises i Log et fund, tydeligt mærket "AI, ikke verificeret"; indgår bevidst ikke i Jager/rangering, som forudsætter data, en enkelt AI-vurdering ikke giver. Se docs/species.md.
- [ ] Feed over slørede fund
- [ ] Følg andre samlere
- [ ] Crowd-verificering af svære bestemmelser — den naturlige forfremmelsesvej for fællesskabsarter: nok uafhængige bekræftelser (eller en hånd-research-tur som kernearternes) flytter en art fra Tier 2 til Tier 1
- [ ] Sæsonudfordringer
- [ ] Delekort som canvas-billede + Web Share API

## Fase 4 — det der gør den til din
- [x] Systemsteders `habitats` udvidet med rigtig jordbund (kalkrig/sandet/mose) og fuld trævariation pr. sted, sourcet enkeltvis hos Naturstyrelsen — se docs/spots.md. Fem nye velkendte, offentligt tilgængelige sjællandske svampesteder tilføjet (Teglstrup Hegn, Gurre Vang, Bidstrup Skovene, Sorø Sønderskov, Faksinge Skov), 10 → 15 i alt
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
