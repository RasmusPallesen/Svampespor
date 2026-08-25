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
- [ ] Rediger og slet fund

## Fase 2 — felten
- [ ] Kort med steder og egne nåle (MapLibre + PostGIS)
- [ ] Hemmelige nåle med klientside-kryptering
- [ ] Billedupload til Supabase Storage, tre slots (i dag: data-URL'er i session)
- [x] Artsbestemmelse via Edge Function (nøglen aldrig i frontend)
- [ ] Offline-kø: log fund uden dækning, synk senere
- [ ] DMI Open Data ved siden af Open-Meteo

## Fase 3 — fællesskab
- [ ] Feed over slørede fund
- [ ] Følg andre samlere
- [ ] Crowd-verificering af svære bestemmelser
- [ ] Sæsonudfordringer
- [ ] Delekort som canvas-billede + Web Share API

## Fase 4 — det der gør den til din
- [ ] Kalibrering af modningsvinduer mod Svampeatlas
- [ ] Personlige mønstre: dine egne fund mod vejret
- [ ] Notifikation når vinduet åbner på et fastgjort sted
- [ ] Artspecifik temperaturrespons

## Åbne spørgsmål
- Målgruppe: kun dig, det danske fællesskab, eller bredere?
- Vil folk overhovedet dele fund, når de frygter at afsløre pletter?
  "Skjul præcis plet" er slået til som standard, men det er en antagelse værd at teste.
- Skal fællesskabet være åbent eller inviteret? Tillid er hele produktet her.
