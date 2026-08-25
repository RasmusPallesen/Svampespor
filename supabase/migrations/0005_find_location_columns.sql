-- Læsbare koordinater ved siden af geom.
--
-- PostgREST returnerer geography-kolonner som rå WKB-hex, ikke brugbar JSON,
-- medmindre man selv konverterer. I stedet for at parse det klientside,
-- afledes lat/lon som genererede kolonner direkte af geom — geom forbliver
-- den ene sandhed, disse er blot en læsbar spejling af den, og nedarver
-- samme RLS-politik som resten af rækken (kun ejeren kan se dem).

alter table finds
  add column lat double precision generated always as (ST_Y((geom::geometry))) stored,
  add column lon double precision generated always as (ST_X((geom::geometry))) stored;
