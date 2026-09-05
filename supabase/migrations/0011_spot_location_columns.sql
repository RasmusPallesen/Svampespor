-- Brugere kan nu tilføje deres eget sted ud fra den nøjagtige position, de
-- selv står på (`spots_write`/`spots_read`-politikkerne fra 0001_init.sql
-- var allerede skrevet til netop dette — kun klientsiden manglede).
--
-- Samme grund som migration 0005 (finds): PostgREST returnerer geography-
-- kolonner som rå WKB-hex, ikke brugbar JSON. Genererede lat/lon-kolonner
-- er den samme løsning, blot for `spots` denne gang.
alter table spots
  add column lat double precision generated always as (ST_Y((geom::geometry))) stored,
  add column lon double precision generated always as (ST_X((geom::geometry))) stored;
